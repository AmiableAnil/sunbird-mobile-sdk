import {DbService} from '../../../../native/db';
import {ExportContentContext} from '../../index';
import {ContentEntry} from '../../db/schema';
import {Response} from '../../../../native/http';
import moment from 'moment';
import {ImportNExportHandler} from '../import-n-export-handler';

export class CreateContentExportManifest {

    private static readonly EKSTEP_CONTENT_ARCHIVE = 'ekstep.content.archive';
    private static readonly SUPPORTED_MANIFEST_VERSION = '1.1';

    constructor(private dbService: DbService,
                private exportHandler: ImportNExportHandler) {
    }

    execute(exportContentContext: ExportContentContext): Promise<Response> {
        const response: Response = new Response();
        const items: any[] = this.exportHandler.populateItems(exportContentContext.contentModelsToExport);
        exportContentContext.items! = [];
        exportContentContext.manifest = {};
        exportContentContext.items = exportContentContext.items!.concat(items);
        const archive: { [key: string]: any } = {};
        archive['ttl'] = 24;
        archive['count'] = exportContentContext.items!.length;
        archive['items'] = exportContentContext.items;

        // Initialize manifest
        exportContentContext.manifest['id'] = CreateContentExportManifest.EKSTEP_CONTENT_ARCHIVE;
        exportContentContext.manifest['ver'] = CreateContentExportManifest.SUPPORTED_MANIFEST_VERSION;
        exportContentContext.manifest['ts'] = moment().format('yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');
        exportContentContext.manifest['archive'] = archive;
        response.body = exportContentContext;
        return Promise.resolve(response);
    }

}
