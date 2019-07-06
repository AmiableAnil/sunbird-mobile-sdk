import {Observable} from 'rxjs';
import {FileService} from '../../../../native/file/def/file-service';
import {AppConfig} from '../../../../native/http/config/app-config';
import {Manifest, TransferContentContext} from '../transfer-content-handler';
import {ContentUtil} from '../../../content/util/content-util';
import {Entry} from '../../../../native/file';
import {Visibility} from '../../../content';

export class ValidateDestinationContent {
    private static readonly MANIFEST_FILE_NAME = 'manifest.json';

    constructor(private fileService: FileService,
                private appConfig: AppConfig) {
    }

    execute(context: TransferContentContext): Observable<TransferContentContext> {
        return Observable.defer(async () => {
            context.validContentIdsInDestination =
                await this.getSubdirectoriesEntries(context.destinationFolder!)
                    .then((entries) => this.extractValidContentIdsInDestination(entries));
            return context;
        });
    }

    private async getSubdirectoriesEntries(directoryPath: string): Promise<Entry[]> {
        return this.fileService.listDir(directoryPath.replace(/\/$/, ''))
            .then(entries => entries
                .filter(e => e.isDirectory)
            );
    }

    private async extractValidContentIdsInDestination(entries: Entry[]) {
        const validContentIdsInDestination: string[] = [];

        for (const entry of entries) {
            if (entry.isDirectory) {
                let manifest: Manifest | undefined;
                try {
                    manifest = await this.extractManifest(entry);
                } catch (e) {
                }

                if (!manifest) {
                    continue;
                }

                const items = manifest.archive.items;
                for (const item of items) {
                    if (ContentUtil.readVisibility(item) === Visibility.PARENT ||
                        !ContentUtil.isCompatible(this.appConfig, ContentUtil.readCompatibilityLevel(item))) {
                        continue;
                    }

                    if (ContentUtil.isDraftContent(item.status) && ContentUtil.isExpired(item.expires)) {
                        continue;
                    }
                    validContentIdsInDestination.push(entry.name);
                }
            }
        }

        return validContentIdsInDestination;
    }

    private async extractManifest(directoryEntry: Entry): Promise<Manifest> {
        const manifestStringified = await this.fileService.readAsText(
            directoryEntry.nativeURL, ValidateDestinationContent.MANIFEST_FILE_NAME);
        return JSON.parse(manifestStringified);
    }


    private validateManifest(manifest: Manifest): boolean {
        return manifest.version !== '1.0' &&
            !!manifest['archive'] &&
            !!manifest['archive']['items'] &&
            !!manifest['archive']['items'].length &&
            this.validateItems(manifest['archive']['items']);
    }

    private validateItems(items: any[]): boolean {
        return items.every((item) =>
            ContentUtil.readVisibility(item) === Visibility.PARENT ||
            !ContentUtil.isCompatible(this.appConfig, ContentUtil.readCompatibilityLevel(item))
        ) && items.every((item) => ContentUtil.isDraftContent(item.status) && ContentUtil.isExpired(item.expires));
    }
}
