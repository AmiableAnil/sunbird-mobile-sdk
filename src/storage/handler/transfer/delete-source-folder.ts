import {MoveContentResponse, MoveContentStatus, TransferContentContext} from '../transfer-content-handler';
import {Observable} from 'rxjs';
import {ContentEntry} from '../../../content/db/schema';
import {ExistingContentAction, StorageEventType, StorageTransferProgress} from '../../index';
import {EventNamespace, EventsBusService} from '../../../events-bus';
import COLUMN_NAME_IDENTIFIER = ContentEntry.COLUMN_NAME_IDENTIFIER;
import COLUMN_NAME_PATH = ContentEntry.COLUMN_NAME_PATH;
import {ArrayUtil} from '../../../util/array-util';

export class DeleteSourceFolder {
    constructor(private eventsBusService: EventsBusService) {
    }

    execute(context: TransferContentContext): Observable<TransferContentContext> {
        return Observable.defer(async () => {
            for (let i = 0; i < context.contentsInSource!.length; i++) {
                const content = context.contentsInSource![i];
                const moveContentResponse = context.duplicateContents!.find((m: MoveContentResponse) =>
                    m.identifier === content[COLUMN_NAME_IDENTIFIER]
                );
                const tempDestination = context.destinationFolder!.concat('temp', '/');
                if (!moveContentResponse || ArrayUtil.isEmpty(context.duplicateContents!)) {
                    try {
                        await this.copyFolder(
                            tempDestination.concat(content[COLUMN_NAME_IDENTIFIER]),
                            context.destinationFolder! + content[COLUMN_NAME_IDENTIFIER]
                        );
                        await this.deleteFolder(tempDestination.concat(content[COLUMN_NAME_IDENTIFIER]));
                        await this.deleteFolder(content[COLUMN_NAME_PATH]!);
                        if (i === (context.contentsInSource!.length - 1)) {
                            await this.deleteFolder(tempDestination);
                        }
                    } catch (e) {
                    }
                    continue;
                }

                if (!context.existingContentAction) {
                    continue;
                }

                if (moveContentResponse.status === MoveContentStatus.SAME_VERSION_IN_BOTH) {
                    continue;
                }

                switch (context.existingContentAction) {
                    case ExistingContentAction.KEEP_HIGER_VERSION:
                        if (moveContentResponse.status === MoveContentStatus.HIGHER_VERSION_IN_DESTINATION) {
                            break;
                        }
                        await this.removeSourceAndDestination(context, content, moveContentResponse);
                        break;
                    case ExistingContentAction.KEEP_LOWER_VERSION:
                        if (moveContentResponse.status === MoveContentStatus.LOWER_VERSION_IN_DESTINATION) {
                            break;
                        }
                        await this.removeSourceAndDestination(context, content, moveContentResponse);
                        break;
                    case ExistingContentAction.KEEP_SOURCE:
                        await this.removeSourceAndDestination(context, content, moveContentResponse);
                        break;
                    case ExistingContentAction.IGNORE:
                    case ExistingContentAction.KEEP_DESTINATION:
                }
                if (i === (context.contentsInSource!.length - 1)) {
                    await this.deleteFolder(tempDestination);
                }

            }

            return context;
        });
    }

    private async deleteFolder(deletedirectory: string): Promise<undefined> {
        if (!deletedirectory) {
            return;
        }
        return new Promise<undefined>((resolve, reject) => {
            buildconfigreader.rm(deletedirectory, '', () => {
                resolve();
            }, (e) => {
                reject(e);
            });
        });
    }

    private async copyFolder(sourceDirectory: string, destinationDirectory: string): Promise<undefined> {
        if (!sourceDirectory || !destinationDirectory) {
            return;
        }

        return new Promise<undefined>((resolve, reject) => {
            buildconfigreader.copyDirectory(sourceDirectory, destinationDirectory, () => {
                resolve();
            }, (e) => {
                reject(e);
            });
        });
    }

    private async renameFolder(sourceDirectory: string, toDirectoryName: string): Promise<undefined> {
        if (!sourceDirectory) {
            return;
        }
        return new Promise<undefined>((resolve, reject) => {
            buildconfigreader.renameDirectory(sourceDirectory, toDirectoryName, () => {
                resolve();
            }, (e) => {
                reject(e);
            });
        });
    }

    private async removeSourceAndDestination(context: TransferContentContext,
                                             content: ContentEntry.SchemaMap,
                                             moveContentResponse: MoveContentResponse) {
        await this.deleteFolder(context.destinationFolder!.concat(moveContentResponse.identifier, '_temp'));
        await this.deleteFolder(content[COLUMN_NAME_PATH]!);
    }
}
