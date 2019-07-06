import {KeyValueStore} from '../index';
import {Observable} from 'rxjs';
import {DbService} from '../../../native/db';
import {KeyValueStoreEntry} from '../db/schema';
import {inject, injectable} from 'inversify';
import {InjectionTokens} from '../../../injection-tokens';

@injectable()
export class KeyValueStoreImpl implements KeyValueStore {
    constructor(@inject(InjectionTokens.DB_SERVICE) private dbService: DbService) {
    }

    getValue(key: string): Observable<string | undefined> {
        return this.dbService.read({
            table: KeyValueStoreEntry.TABLE_NAME,
            columns: [],
            selection: `${KeyValueStoreEntry.COLUMN_NAME_KEY} = ?`,
            selectionArgs: [key]
        }).map((res: { key: string, value: string }[]) => res[0] && res[0].value);
    }

    setValue(key: string, value: string): Observable<boolean> {
        return this.getValue(key)
            .mergeMap((response: string | undefined) => {
                if (response) {
                    return this.dbService.update({
                        table: KeyValueStoreEntry.TABLE_NAME,
                        selection: `${KeyValueStoreEntry.COLUMN_NAME_KEY} = ?`,
                        selectionArgs: [key],
                        modelJson: {
                            [KeyValueStoreEntry.COLUMN_NAME_KEY]: key,
                            [KeyValueStoreEntry.COLUMN_NAME_VALUE]: value
                        }
                    }).map(v => v > 0);

                } else {
                    return this.dbService.insert({
                        table: KeyValueStoreEntry.TABLE_NAME,
                        modelJson: {
                            [KeyValueStoreEntry.COLUMN_NAME_KEY]: key,
                            [KeyValueStoreEntry.COLUMN_NAME_VALUE]: value
                        }
                    }).map(v => v > 0);
                }
            });
    }
}

