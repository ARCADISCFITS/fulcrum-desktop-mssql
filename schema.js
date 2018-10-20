import Schema from 'fulcrum-schema/dist/schema';
import sqldiff from 'sqldiff';
import MSSchema from './mssql-schema';

const {SchemaDiffer, MSSQL} = sqldiff;

export default class MSSQLSchema {
  static async generateSchemaStatements(account, oldForm, newForm) {
    let oldSchema = null;
    let newSchema = null;

    if (oldForm) {
      oldSchema = new Schema(oldForm, MSSchema, null);
    }

    if (newForm) {
      newSchema = new Schema(newForm, MSSchema, null);
    }

    const differ = new SchemaDiffer(oldSchema, newSchema);
    const generator = new MSSQL(differ, {afterTransform: null});

    generator.tablePrefix = 'account_' + account.rowID + '_';

    const statements = generator.generate();

    return {statements, oldSchema, newSchema};
  }
}
