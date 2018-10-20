'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _mssql = require('mssql');

var _mssql2 = _interopRequireDefault(_mssql);

var _util = require('util');

var _schema = require('./schema');

var _schema2 = _interopRequireDefault(_schema);

var _fulcrumDesktopPlugin = require('fulcrum-desktop-plugin');

var _mssqlRecordValues = require('./mssql-record-values');

var _mssqlRecordValues2 = _interopRequireDefault(_mssqlRecordValues);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const MSSQL_CONFIG = {
  database: 'fulcrumapp',
  host: 'localhost',
  port: 1433,
  max: 10,
  idleTimeoutMillis: 30000
};

exports.default = class {
  constructor() {
    var _this = this;

    this.runCommand = _asyncToGenerator(function* () {
      yield _this.activate();
      if (fulcrum.args.setup) {
        yield _this.createDatabase(fulcrum.args.msDatabase || 'fulcrumapp');
        return;
      }

      const account = yield fulcrum.fetchAccount(fulcrum.args.org);

      if (account) {
        const forms = yield account.findActiveForms({});

        for (const form of forms) {
          yield _this.rebuildForm(form, account, function (index) {
            _this.updateStatus(form.name.green + ' : ' + index.toString().red + ' records');
          });

          console.log('');
        }
      } else {
        console.error('Unable to find account', fulcrum.args.org);
      }
    });

    this.ident = name => {
      return '[' + name + ']';
    };

    this.run = (() => {
      var _ref2 = _asyncToGenerator(function* (sql) {
        sql = sql.replace(/\0/g, '');

        if (fulcrum.args.debug) {
          console.log(sql);
        }

        const result = yield _this.pool.request().batch(sql);

        return result.recordset;
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    })();

    this.log = (...args) => {
      // console.log(...args);
    };

    this.tableName = (account, name) => {
      return 'account_' + account.rowID + '_' + name;
    };

    this.onFormSave = (() => {
      var _ref3 = _asyncToGenerator(function* ({ form, account, oldForm, newForm }) {
        yield _this.updateForm(form, account, oldForm, newForm);
      });

      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    })();

    this.onRecordSave = (() => {
      var _ref4 = _asyncToGenerator(function* ({ record, account }) {
        yield _this.updateRecord(record, account);
      });

      return function (_x3) {
        return _ref4.apply(this, arguments);
      };
    })();

    this.onRecordDelete = (() => {
      var _ref5 = _asyncToGenerator(function* ({ record }) {
        const statements = _mssqlRecordValues2.default.deleteForRecordStatements(_this.mssql, record, record.form);

        for (const statement of statements) {
          yield _this.run(statement.sql);
        }
      });

      return function (_x4) {
        return _ref5.apply(this, arguments);
      };
    })();

    this.onChoiceListSave = (() => {
      var _ref6 = _asyncToGenerator(function* ({ object }) {});

      return function (_x5) {
        return _ref6.apply(this, arguments);
      };
    })();

    this.onClassificationSetSave = (() => {
      var _ref7 = _asyncToGenerator(function* ({ object }) {});

      return function (_x6) {
        return _ref7.apply(this, arguments);
      };
    })();

    this.onProjectSave = (() => {
      var _ref8 = _asyncToGenerator(function* ({ object }) {});

      return function (_x7) {
        return _ref8.apply(this, arguments);
      };
    })();

    this.reloadTableList = _asyncToGenerator(function* () {
      const rows = yield _this.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'");

      _this.tableNames = rows.map(function (o) {
        return o.name;
      });
    });

    this.updateRecord = (() => {
      var _ref10 = _asyncToGenerator(function* (record, account, skipTableCheck) {
        if (!skipTableCheck && !_this.rootTableExists(record.form)) {
          yield _this.rebuildForm(record.form, account, function () {});
        }

        const statements = _mssqlRecordValues2.default.updateForRecordStatements(_this.mssql, record);

        //console.log('*********************** Start updateRecord ***********************');
        for (const statement of statements) {
          //console.log(statement);
          yield _this.run(statement.sql);
        }
        //console.log('************************ End updateRecord ************************');
      });

      return function (_x8, _x9, _x10) {
        return _ref10.apply(this, arguments);
      };
    })();

    this.rootTableExists = form => {
      return this.tableNames.indexOf(_mssqlRecordValues2.default.tableNameWithForm(form)) !== -1;
    };

    this.recreateFormTables = (() => {
      var _ref11 = _asyncToGenerator(function* (form, account) {
        try {
          yield _this.updateForm(form, account, _this.formVersion(form), null);
        } catch (ex) {
          if (fulcrum.args.debug) {
            console.error(sql);
          }
        }

        yield _this.updateForm(form, account, null, _this.formVersion(form));
      });

      return function (_x11, _x12) {
        return _ref11.apply(this, arguments);
      };
    })();

    this.updateForm = (() => {
      var _ref12 = _asyncToGenerator(function* (form, account, oldForm, newForm) {
        if (!_this.rootTableExists(form) && newForm != null) {
          oldForm = null;
        }

        const { statements } = yield _schema2.default.generateSchemaStatements(account, oldForm, newForm);

        yield _this.dropFriendlyView(form, null);

        for (const repeatable of form.elementsOfType('Repeatable')) {
          yield _this.dropFriendlyView(form, repeatable);
        }

        for (const sql of statements) {
          yield _this.run(sql);
        }
        // await this.run(statements.join('\n'));

        yield _this.createFriendlyView(form, null);

        for (const repeatable of form.elementsOfType('Repeatable')) {
          yield _this.createFriendlyView(form, repeatable);
        }
      });

      return function (_x13, _x14, _x15, _x16) {
        return _ref12.apply(this, arguments);
      };
    })();

    this.formVersion = form => {
      if (form == null) {
        return null;
      }

      return {
        id: form._id,
        row_id: form.rowID,
        name: form._name,
        elements: form._elementsJSON
      };
    };

    this.updateStatus = message => {
      if (process.stdout.isTTY) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(message);
      }
    };
  }

  task(cli) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return cli.command({
        command: 'mssql',
        desc: 'run the MSSQL sync for a specific organization',
        builder: {
          msDatabase: {
            desc: 'mssql database name',
            type: 'string',
            default: MSSQL_CONFIG.database
          },
          msHost: {
            desc: 'mssql server host',
            type: 'string',
            default: MSSQL_CONFIG.host
          },
          msPort: {
            desc: 'mssql server port',
            type: 'integer',
            default: MSSQL_CONFIG.port
          },
          msUser: {
            desc: 'mssql user',
            type: 'string'
          },
          msPassword: {
            desc: 'mssql password',
            type: 'string'
          },
          msSchema: {
            desc: 'mssql schema',
            type: 'string'
          },
          msConnectionString: {
            desc: 'mssql connection string',
            type: 'string'
          },
          org: {
            desc: 'organization name',
            required: true,
            type: 'string'
          },
          setup: {
            desc: 'setup the database',
            type: 'boolean'
          }
        },
        handler: _this2.runCommand
      });
    })();
  }

  get useSyncEvents() {
    return fulcrum.args.msSyncEvents != null ? fulcrum.args.msSyncEvents : true;
  }

  activate() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      const options = _this3.connectionOptions;

      _this3.pool = yield _mssql2.default.connect(options);

      if (_this3.useSyncEvents) {
        // fulcrum.on('choice_list:save', this.onChoiceListSave);
        // fulcrum.on('classification_set:save', this.onClassificationSetSave);
        // fulcrum.on('project:save', this.onProjectSave);
        fulcrum.on('record:save', _this3.onRecordSave);
        fulcrum.on('record:delete', _this3.onRecordDelete);

        // fulcrum.on('choice_list:save', this.onChoiceListSave);
        fulcrum.on('form:save', _this3.onFormSave);
        fulcrum.on('form:delete', _this3.onFormSave);

        // fulcrum.on('classification_set:save', this.onClassificationSetSave);
        // fulcrum.on('project:save', this.onProjectSave);
      }
      _this3.dataSchema = fulcrum.args.msSchema || 'dbo';
      // Fetch all the existing tables on startup. This allows us to special case the
      // creation of new tables even when the form isn't version 1. If the table doesn't
      // exist, we can pretend the form is version 1 so it creates all new tables instead
      // of applying a schema diff.
      const rows = yield _this3.run("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='dbo'");

      _this3.tableNames = rows.map(function (o) {
        return o.name;
      });

      // make a client so we can use it to build SQL statements
      _this3.mssql = new _fulcrumDesktopPlugin.MSSQL({});
    })();
  }

  deactivate() {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (_this4.pool) {
        yield _this4.pool.close();
      }
    })();
  }

  dropFriendlyView(form, repeatable) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this5.getFriendlyTableName(form, repeatable);

      try {
        yield _this5.run((0, _util.format)('DROP VIEW IF EXISTS %s.%s;', _this5.ident(_this5.dataSchema), _this5.ident(viewName)));
      } catch (ex) {
        if (fulcrum.args.debug) {
          console.error(ex);
        }
        // sometimes it doesn't exist
      }
    })();
  }

  createFriendlyView(form, repeatable) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const viewName = _this6.getFriendlyTableName(form, repeatable);

      try {
        yield _this6.run((0, _util.format)('CREATE VIEW %s.%s AS SELECT * FROM %s_view_full;', _this6.ident(_this6.dataSchema), _this6.ident(viewName), _mssqlRecordValues2.default.tableNameWithForm(form, repeatable)));
      } catch (ex) {
        if (fulcrum.args.debug) {
          console.error(ex);
        }
        // sometimes it doesn't exist
      }
    })();
  }

  getFriendlyTableName(form, repeatable) {
    const name = repeatable ? `${form.name} - ${repeatable.dataName}` : form.name;

    return name;
  }

  rebuildForm(form, account, progress) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      yield _this7.recreateFormTables(form, account);
      yield _this7.reloadTableList();

      let index = 0;

      yield form.findEachRecord({}, (() => {
        var _ref13 = _asyncToGenerator(function* (record) {
          record.form = form;

          if (++index % 10 === 0) {
            progress(index);
          }

          yield _this7.updateRecord(record, account, true);
        });

        return function (_x17) {
          return _ref13.apply(this, arguments);
        };
      })());

      progress(index);
    })();
  }

  get connectionOptions() {
    if (fulcrum.args.msConnectionString) {
      return fulcrum.args.msConnectionString;
    }

    const options = _extends({}, MSSQL_CONFIG, {
      server: fulcrum.args.msHost || MSSQL_CONFIG.host,
      port: fulcrum.args.msPort || MSSQL_CONFIG.port,
      database: fulcrum.args.msDatabase || MSSQL_CONFIG.database,
      user: fulcrum.args.msUser || MSSQL_CONFIG.user,
      password: fulcrum.args.msPassword || MSSQL_CONFIG.password,
      options: {
        encrypt: true // Use this if you're on Windows Azure
      }
    });
    /*
        if (fulcrum.args.msUser) {
          options.user = fulcrum.args.msUser;
        }
    
        if (fulcrum.args.msPassword) {
          options.password = fulcrum.args.msPassword;
        }
    */
    return options;
  }

  createDatabase(databaseName) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      const options = _this8.connectionOptions;

      options.database = null;
      _this8.pool = yield _mssql2.default.connect(options);
      const sql = `CREATE DATABASE ${databaseName}`;
      console.log(sql);
      const rows = yield _this8.run(sql);
    })();
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3BsdWdpbi5qcyJdLCJuYW1lcyI6WyJNU1NRTF9DT05GSUciLCJkYXRhYmFzZSIsImhvc3QiLCJwb3J0IiwibWF4IiwiaWRsZVRpbWVvdXRNaWxsaXMiLCJydW5Db21tYW5kIiwiYWN0aXZhdGUiLCJmdWxjcnVtIiwiYXJncyIsInNldHVwIiwiY3JlYXRlRGF0YWJhc2UiLCJtc0RhdGFiYXNlIiwiYWNjb3VudCIsImZldGNoQWNjb3VudCIsIm9yZyIsImZvcm1zIiwiZmluZEFjdGl2ZUZvcm1zIiwiZm9ybSIsInJlYnVpbGRGb3JtIiwiaW5kZXgiLCJ1cGRhdGVTdGF0dXMiLCJuYW1lIiwiZ3JlZW4iLCJ0b1N0cmluZyIsInJlZCIsImNvbnNvbGUiLCJsb2ciLCJlcnJvciIsImlkZW50IiwicnVuIiwic3FsIiwicmVwbGFjZSIsImRlYnVnIiwicmVzdWx0IiwicG9vbCIsInJlcXVlc3QiLCJiYXRjaCIsInJlY29yZHNldCIsInRhYmxlTmFtZSIsInJvd0lEIiwib25Gb3JtU2F2ZSIsIm9sZEZvcm0iLCJuZXdGb3JtIiwidXBkYXRlRm9ybSIsIm9uUmVjb3JkU2F2ZSIsInJlY29yZCIsInVwZGF0ZVJlY29yZCIsIm9uUmVjb3JkRGVsZXRlIiwic3RhdGVtZW50cyIsImRlbGV0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJtc3NxbCIsInN0YXRlbWVudCIsIm9uQ2hvaWNlTGlzdFNhdmUiLCJvYmplY3QiLCJvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSIsIm9uUHJvamVjdFNhdmUiLCJyZWxvYWRUYWJsZUxpc3QiLCJyb3dzIiwidGFibGVOYW1lcyIsIm1hcCIsIm8iLCJza2lwVGFibGVDaGVjayIsInJvb3RUYWJsZUV4aXN0cyIsInVwZGF0ZUZvclJlY29yZFN0YXRlbWVudHMiLCJpbmRleE9mIiwidGFibGVOYW1lV2l0aEZvcm0iLCJyZWNyZWF0ZUZvcm1UYWJsZXMiLCJmb3JtVmVyc2lvbiIsImV4IiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiZHJvcEZyaWVuZGx5VmlldyIsInJlcGVhdGFibGUiLCJlbGVtZW50c09mVHlwZSIsImNyZWF0ZUZyaWVuZGx5VmlldyIsImlkIiwiX2lkIiwicm93X2lkIiwiX25hbWUiLCJlbGVtZW50cyIsIl9lbGVtZW50c0pTT04iLCJtZXNzYWdlIiwicHJvY2VzcyIsInN0ZG91dCIsImlzVFRZIiwiY2xlYXJMaW5lIiwiY3Vyc29yVG8iLCJ3cml0ZSIsInRhc2siLCJjbGkiLCJjb21tYW5kIiwiZGVzYyIsImJ1aWxkZXIiLCJ0eXBlIiwiZGVmYXVsdCIsIm1zSG9zdCIsIm1zUG9ydCIsIm1zVXNlciIsIm1zUGFzc3dvcmQiLCJtc1NjaGVtYSIsIm1zQ29ubmVjdGlvblN0cmluZyIsInJlcXVpcmVkIiwiaGFuZGxlciIsInVzZVN5bmNFdmVudHMiLCJtc1N5bmNFdmVudHMiLCJvcHRpb25zIiwiY29ubmVjdGlvbk9wdGlvbnMiLCJjb25uZWN0Iiwib24iLCJkYXRhU2NoZW1hIiwiZGVhY3RpdmF0ZSIsImNsb3NlIiwidmlld05hbWUiLCJnZXRGcmllbmRseVRhYmxlTmFtZSIsImRhdGFOYW1lIiwicHJvZ3Jlc3MiLCJmaW5kRWFjaFJlY29yZCIsInNlcnZlciIsInVzZXIiLCJwYXNzd29yZCIsImVuY3J5cHQiLCJkYXRhYmFzZU5hbWUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7OztBQUVBLE1BQU1BLGVBQWU7QUFDbkJDLFlBQVUsWUFEUztBQUVuQkMsUUFBTSxXQUZhO0FBR25CQyxRQUFNLElBSGE7QUFJbkJDLE9BQUssRUFKYztBQUtuQkMscUJBQW1CO0FBTEEsQ0FBckI7O2tCQVFlLE1BQU07QUFBQTtBQUFBOztBQUFBLFNBbURuQkMsVUFuRG1CLHFCQW1ETixhQUFZO0FBQ3ZCLFlBQU0sTUFBS0MsUUFBTCxFQUFOO0FBQ0EsVUFBSUMsUUFBUUMsSUFBUixDQUFhQyxLQUFqQixFQUF3QjtBQUN0QixjQUFNLE1BQUtDLGNBQUwsQ0FBb0JILFFBQVFDLElBQVIsQ0FBYUcsVUFBYixJQUEyQixZQUEvQyxDQUFOO0FBQ0E7QUFDRDs7QUFFRCxZQUFNQyxVQUFVLE1BQU1MLFFBQVFNLFlBQVIsQ0FBcUJOLFFBQVFDLElBQVIsQ0FBYU0sR0FBbEMsQ0FBdEI7O0FBRUEsVUFBSUYsT0FBSixFQUFhO0FBQ1gsY0FBTUcsUUFBUSxNQUFNSCxRQUFRSSxlQUFSLENBQXdCLEVBQXhCLENBQXBCOztBQUVBLGFBQUssTUFBTUMsSUFBWCxJQUFtQkYsS0FBbkIsRUFBMEI7QUFDeEIsZ0JBQU0sTUFBS0csV0FBTCxDQUFpQkQsSUFBakIsRUFBdUJMLE9BQXZCLEVBQWdDLFVBQUNPLEtBQUQsRUFBVztBQUMvQyxrQkFBS0MsWUFBTCxDQUFrQkgsS0FBS0ksSUFBTCxDQUFVQyxLQUFWLEdBQWtCLEtBQWxCLEdBQTBCSCxNQUFNSSxRQUFOLEdBQWlCQyxHQUEzQyxHQUFpRCxVQUFuRTtBQUNELFdBRkssQ0FBTjs7QUFJQUMsa0JBQVFDLEdBQVIsQ0FBWSxFQUFaO0FBQ0Q7QUFDRixPQVZELE1BVU87QUFDTEQsZ0JBQVFFLEtBQVIsQ0FBYyx3QkFBZCxFQUF3Q3BCLFFBQVFDLElBQVIsQ0FBYU0sR0FBckQ7QUFDRDtBQUNGLEtBekVrQjs7QUFBQSxTQXFIbkJjLEtBckhtQixHQXFIVlAsSUFBRCxJQUFVO0FBQ2hCLGFBQU8sTUFBTUEsSUFBTixHQUFhLEdBQXBCO0FBQ0QsS0F2SGtCOztBQUFBLFNBeUhuQlEsR0F6SG1CO0FBQUEsb0NBeUhiLFdBQU9DLEdBQVAsRUFBZTtBQUNuQkEsY0FBTUEsSUFBSUMsT0FBSixDQUFZLEtBQVosRUFBbUIsRUFBbkIsQ0FBTjs7QUFFQSxZQUFJeEIsUUFBUUMsSUFBUixDQUFhd0IsS0FBakIsRUFBd0I7QUFDdEJQLGtCQUFRQyxHQUFSLENBQVlJLEdBQVo7QUFDRDs7QUFFRCxjQUFNRyxTQUFTLE1BQU0sTUFBS0MsSUFBTCxDQUFVQyxPQUFWLEdBQW9CQyxLQUFwQixDQUEwQk4sR0FBMUIsQ0FBckI7O0FBRUEsZUFBT0csT0FBT0ksU0FBZDtBQUNELE9BbklrQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQXFJbkJYLEdBckltQixHQXFJYixDQUFDLEdBQUdsQixJQUFKLEtBQWE7QUFDakI7QUFDRCxLQXZJa0I7O0FBQUEsU0F5SW5COEIsU0F6SW1CLEdBeUlQLENBQUMxQixPQUFELEVBQVVTLElBQVYsS0FBbUI7QUFDN0IsYUFBTyxhQUFhVCxRQUFRMkIsS0FBckIsR0FBNkIsR0FBN0IsR0FBbUNsQixJQUExQztBQUNELEtBM0lrQjs7QUFBQSxTQTZJbkJtQixVQTdJbUI7QUFBQSxvQ0E2SU4sV0FBTyxFQUFDdkIsSUFBRCxFQUFPTCxPQUFQLEVBQWdCNkIsT0FBaEIsRUFBeUJDLE9BQXpCLEVBQVAsRUFBNkM7QUFDeEQsY0FBTSxNQUFLQyxVQUFMLENBQWdCMUIsSUFBaEIsRUFBc0JMLE9BQXRCLEVBQStCNkIsT0FBL0IsRUFBd0NDLE9BQXhDLENBQU47QUFDRCxPQS9Ja0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FpSm5CRSxZQWpKbUI7QUFBQSxvQ0FpSkosV0FBTyxFQUFDQyxNQUFELEVBQVNqQyxPQUFULEVBQVAsRUFBNkI7QUFDMUMsY0FBTSxNQUFLa0MsWUFBTCxDQUFrQkQsTUFBbEIsRUFBMEJqQyxPQUExQixDQUFOO0FBQ0QsT0FuSmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBcUpuQm1DLGNBckptQjtBQUFBLG9DQXFKRixXQUFPLEVBQUNGLE1BQUQsRUFBUCxFQUFvQjtBQUNuQyxjQUFNRyxhQUFhLDRCQUFrQkMseUJBQWxCLENBQTRDLE1BQUtDLEtBQWpELEVBQXdETCxNQUF4RCxFQUFnRUEsT0FBTzVCLElBQXZFLENBQW5COztBQUVBLGFBQUssTUFBTWtDLFNBQVgsSUFBd0JILFVBQXhCLEVBQW9DO0FBQ2xDLGdCQUFNLE1BQUtuQixHQUFMLENBQVNzQixVQUFVckIsR0FBbkIsQ0FBTjtBQUNEO0FBQ0YsT0EzSmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBNkpuQnNCLGdCQTdKbUI7QUFBQSxvQ0E2SkEsV0FBTyxFQUFDQyxNQUFELEVBQVAsRUFBb0IsQ0FDdEMsQ0E5SmtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBZ0tuQkMsdUJBaEttQjtBQUFBLG9DQWdLTyxXQUFPLEVBQUNELE1BQUQsRUFBUCxFQUFvQixDQUM3QyxDQWpLa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0FtS25CRSxhQW5LbUI7QUFBQSxvQ0FtS0gsV0FBTyxFQUFDRixNQUFELEVBQVAsRUFBb0IsQ0FDbkMsQ0FwS2tCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBc0tuQkcsZUF0S21CLHFCQXNLRCxhQUFZO0FBQzVCLFlBQU1DLE9BQU8sTUFBTSxNQUFLNUIsR0FBTCxDQUFTLHNGQUFULENBQW5COztBQUVBLFlBQUs2QixVQUFMLEdBQWtCRCxLQUFLRSxHQUFMLENBQVM7QUFBQSxlQUFLQyxFQUFFdkMsSUFBUDtBQUFBLE9BQVQsQ0FBbEI7QUFDRCxLQTFLa0I7O0FBQUEsU0E0S25CeUIsWUE1S21CO0FBQUEscUNBNEtKLFdBQU9ELE1BQVAsRUFBZWpDLE9BQWYsRUFBd0JpRCxjQUF4QixFQUEyQztBQUN4RCxZQUFJLENBQUNBLGNBQUQsSUFBbUIsQ0FBQyxNQUFLQyxlQUFMLENBQXFCakIsT0FBTzVCLElBQTVCLENBQXhCLEVBQTJEO0FBQ3pELGdCQUFNLE1BQUtDLFdBQUwsQ0FBaUIyQixPQUFPNUIsSUFBeEIsRUFBOEJMLE9BQTlCLEVBQXVDLFlBQU0sQ0FBRSxDQUEvQyxDQUFOO0FBQ0Q7O0FBRUQsY0FBTW9DLGFBQWEsNEJBQWtCZSx5QkFBbEIsQ0FBNEMsTUFBS2IsS0FBakQsRUFBd0RMLE1BQXhELENBQW5COztBQUVKO0FBQ0ksYUFBSyxNQUFNTSxTQUFYLElBQXdCSCxVQUF4QixFQUFvQztBQUN4QztBQUNNLGdCQUFNLE1BQUtuQixHQUFMLENBQVNzQixVQUFVckIsR0FBbkIsQ0FBTjtBQUNEO0FBQ0w7QUFDRyxPQXpMa0I7O0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsU0EyTG5CZ0MsZUEzTG1CLEdBMkxBN0MsSUFBRCxJQUFVO0FBQzFCLGFBQU8sS0FBS3lDLFVBQUwsQ0FBZ0JNLE9BQWhCLENBQXdCLDRCQUFrQkMsaUJBQWxCLENBQW9DaEQsSUFBcEMsQ0FBeEIsTUFBdUUsQ0FBQyxDQUEvRTtBQUNELEtBN0xrQjs7QUFBQSxTQStMbkJpRCxrQkEvTG1CO0FBQUEscUNBK0xFLFdBQU9qRCxJQUFQLEVBQWFMLE9BQWIsRUFBeUI7QUFDNUMsWUFBSTtBQUNGLGdCQUFNLE1BQUsrQixVQUFMLENBQWdCMUIsSUFBaEIsRUFBc0JMLE9BQXRCLEVBQStCLE1BQUt1RCxXQUFMLENBQWlCbEQsSUFBakIsQ0FBL0IsRUFBdUQsSUFBdkQsQ0FBTjtBQUNELFNBRkQsQ0FFRSxPQUFPbUQsRUFBUCxFQUFXO0FBQ1gsY0FBSTdELFFBQVFDLElBQVIsQ0FBYXdCLEtBQWpCLEVBQXdCO0FBQ3RCUCxvQkFBUUUsS0FBUixDQUFjRyxHQUFkO0FBQ0Q7QUFDRjs7QUFFRCxjQUFNLE1BQUthLFVBQUwsQ0FBZ0IxQixJQUFoQixFQUFzQkwsT0FBdEIsRUFBK0IsSUFBL0IsRUFBcUMsTUFBS3VELFdBQUwsQ0FBaUJsRCxJQUFqQixDQUFyQyxDQUFOO0FBQ0QsT0F6TWtCOztBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLFNBMk1uQjBCLFVBM01tQjtBQUFBLHFDQTJNTixXQUFPMUIsSUFBUCxFQUFhTCxPQUFiLEVBQXNCNkIsT0FBdEIsRUFBK0JDLE9BQS9CLEVBQTJDO0FBQ3RELFlBQUksQ0FBQyxNQUFLb0IsZUFBTCxDQUFxQjdDLElBQXJCLENBQUQsSUFBK0J5QixXQUFXLElBQTlDLEVBQW9EO0FBQ2xERCxvQkFBVSxJQUFWO0FBQ0Q7O0FBRUQsY0FBTSxFQUFDTyxVQUFELEtBQWUsTUFBTSxpQkFBWXFCLHdCQUFaLENBQXFDekQsT0FBckMsRUFBOEM2QixPQUE5QyxFQUF1REMsT0FBdkQsQ0FBM0I7O0FBRUEsY0FBTSxNQUFLNEIsZ0JBQUwsQ0FBc0JyRCxJQUF0QixFQUE0QixJQUE1QixDQUFOOztBQUVBLGFBQUssTUFBTXNELFVBQVgsSUFBeUJ0RCxLQUFLdUQsY0FBTCxDQUFvQixZQUFwQixDQUF6QixFQUE0RDtBQUMxRCxnQkFBTSxNQUFLRixnQkFBTCxDQUFzQnJELElBQXRCLEVBQTRCc0QsVUFBNUIsQ0FBTjtBQUNEOztBQUVELGFBQUssTUFBTXpDLEdBQVgsSUFBa0JrQixVQUFsQixFQUE4QjtBQUM1QixnQkFBTSxNQUFLbkIsR0FBTCxDQUFTQyxHQUFULENBQU47QUFDRDtBQUNEOztBQUVBLGNBQU0sTUFBSzJDLGtCQUFMLENBQXdCeEQsSUFBeEIsRUFBOEIsSUFBOUIsQ0FBTjs7QUFFQSxhQUFLLE1BQU1zRCxVQUFYLElBQXlCdEQsS0FBS3VELGNBQUwsQ0FBb0IsWUFBcEIsQ0FBekIsRUFBNEQ7QUFDMUQsZ0JBQU0sTUFBS0Msa0JBQUwsQ0FBd0J4RCxJQUF4QixFQUE4QnNELFVBQTlCLENBQU47QUFDRDtBQUNGLE9BbE9rQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFBQSxTQTBSbkJKLFdBMVJtQixHQTBSSmxELElBQUQsSUFBVTtBQUN0QixVQUFJQSxRQUFRLElBQVosRUFBa0I7QUFDaEIsZUFBTyxJQUFQO0FBQ0Q7O0FBRUQsYUFBTztBQUNMeUQsWUFBSXpELEtBQUswRCxHQURKO0FBRUxDLGdCQUFRM0QsS0FBS3NCLEtBRlI7QUFHTGxCLGNBQU1KLEtBQUs0RCxLQUhOO0FBSUxDLGtCQUFVN0QsS0FBSzhEO0FBSlYsT0FBUDtBQU1ELEtBclNrQjs7QUFBQSxTQXVTbkIzRCxZQXZTbUIsR0F1U0g0RCxPQUFELElBQWE7QUFDMUIsVUFBSUMsUUFBUUMsTUFBUixDQUFlQyxLQUFuQixFQUEwQjtBQUN4QkYsZ0JBQVFDLE1BQVIsQ0FBZUUsU0FBZjtBQUNBSCxnQkFBUUMsTUFBUixDQUFlRyxRQUFmLENBQXdCLENBQXhCO0FBQ0FKLGdCQUFRQyxNQUFSLENBQWVJLEtBQWYsQ0FBcUJOLE9BQXJCO0FBQ0Q7QUFDRixLQTdTa0I7QUFBQTs7QUFDYk8sTUFBTixDQUFXQyxHQUFYLEVBQWdCO0FBQUE7O0FBQUE7QUFDZCxhQUFPQSxJQUFJQyxPQUFKLENBQVk7QUFDakJBLGlCQUFTLE9BRFE7QUFFakJDLGNBQU0sZ0RBRlc7QUFHakJDLGlCQUFTO0FBQ1BoRixzQkFBWTtBQUNWK0Usa0JBQU0scUJBREk7QUFFVkUsa0JBQU0sUUFGSTtBQUdWQyxxQkFBUzlGLGFBQWFDO0FBSFosV0FETDtBQU1QOEYsa0JBQVE7QUFDTkosa0JBQU0sbUJBREE7QUFFTkUsa0JBQU0sUUFGQTtBQUdOQyxxQkFBUzlGLGFBQWFFO0FBSGhCLFdBTkQ7QUFXUDhGLGtCQUFRO0FBQ05MLGtCQUFNLG1CQURBO0FBRU5FLGtCQUFNLFNBRkE7QUFHTkMscUJBQVM5RixhQUFhRztBQUhoQixXQVhEO0FBZ0JQOEYsa0JBQVE7QUFDTk4sa0JBQU0sWUFEQTtBQUVORSxrQkFBTTtBQUZBLFdBaEJEO0FBb0JQSyxzQkFBWTtBQUNWUCxrQkFBTSxnQkFESTtBQUVWRSxrQkFBTTtBQUZJLFdBcEJMO0FBd0JQTSxvQkFBVTtBQUNSUixrQkFBTSxjQURFO0FBRVJFLGtCQUFNO0FBRkUsV0F4Qkg7QUE0QlBPLDhCQUFvQjtBQUNsQlQsa0JBQU0seUJBRFk7QUFFbEJFLGtCQUFNO0FBRlksV0E1QmI7QUFnQ1A5RSxlQUFLO0FBQ0g0RSxrQkFBTSxtQkFESDtBQUVIVSxzQkFBVSxJQUZQO0FBR0hSLGtCQUFNO0FBSEgsV0FoQ0U7QUFxQ1BuRixpQkFBTztBQUNMaUYsa0JBQU0sb0JBREQ7QUFFTEUsa0JBQU07QUFGRDtBQXJDQSxTQUhRO0FBNkNqQlMsaUJBQVMsT0FBS2hHO0FBN0NHLE9BQVosQ0FBUDtBQURjO0FBZ0RmOztBQTBCRCxNQUFJaUcsYUFBSixHQUFvQjtBQUNsQixXQUFPL0YsUUFBUUMsSUFBUixDQUFhK0YsWUFBYixJQUE2QixJQUE3QixHQUFvQ2hHLFFBQVFDLElBQVIsQ0FBYStGLFlBQWpELEdBQWdFLElBQXZFO0FBQ0Q7O0FBRUtqRyxVQUFOLEdBQWlCO0FBQUE7O0FBQUE7QUFDZixZQUFNa0csVUFBVSxPQUFLQyxpQkFBckI7O0FBRUEsYUFBS3ZFLElBQUwsR0FBWSxNQUFNLGdCQUFNd0UsT0FBTixDQUFjRixPQUFkLENBQWxCOztBQUVBLFVBQUksT0FBS0YsYUFBVCxFQUF3QjtBQUN4QjtBQUNBO0FBQ0E7QUFDRS9GLGdCQUFRb0csRUFBUixDQUFXLGFBQVgsRUFBMEIsT0FBSy9ELFlBQS9CO0FBQ0FyQyxnQkFBUW9HLEVBQVIsQ0FBVyxlQUFYLEVBQTRCLE9BQUs1RCxjQUFqQzs7QUFFQTtBQUNBeEMsZ0JBQVFvRyxFQUFSLENBQVcsV0FBWCxFQUF3QixPQUFLbkUsVUFBN0I7QUFDQWpDLGdCQUFRb0csRUFBUixDQUFXLGFBQVgsRUFBMEIsT0FBS25FLFVBQS9COztBQUVBO0FBQ0E7QUFDRDtBQUNELGFBQUtvRSxVQUFMLEdBQWtCckcsUUFBUUMsSUFBUixDQUFhMEYsUUFBYixJQUF5QixLQUEzQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBTXpDLE9BQU8sTUFBTSxPQUFLNUIsR0FBTCxDQUFTLG1GQUFULENBQW5COztBQUVBLGFBQUs2QixVQUFMLEdBQWtCRCxLQUFLRSxHQUFMLENBQVM7QUFBQSxlQUFLQyxFQUFFdkMsSUFBUDtBQUFBLE9BQVQsQ0FBbEI7O0FBRUE7QUFDQSxhQUFLNkIsS0FBTCxHQUFhLGdDQUFVLEVBQVYsQ0FBYjtBQTdCZTtBQThCaEI7O0FBRUsyRCxZQUFOLEdBQW1CO0FBQUE7O0FBQUE7QUFDakIsVUFBSSxPQUFLM0UsSUFBVCxFQUFlO0FBQ2IsY0FBTSxPQUFLQSxJQUFMLENBQVU0RSxLQUFWLEVBQU47QUFDRDtBQUhnQjtBQUlsQjs7QUFpSEt4QyxrQkFBTixDQUF1QnJELElBQXZCLEVBQTZCc0QsVUFBN0IsRUFBeUM7QUFBQTs7QUFBQTtBQUN2QyxZQUFNd0MsV0FBVyxPQUFLQyxvQkFBTCxDQUEwQi9GLElBQTFCLEVBQWdDc0QsVUFBaEMsQ0FBakI7O0FBRUEsVUFBSTtBQUNGLGNBQU0sT0FBSzFDLEdBQUwsQ0FBUyxrQkFBTyw0QkFBUCxFQUFxQyxPQUFLRCxLQUFMLENBQVcsT0FBS2dGLFVBQWhCLENBQXJDLEVBQWtFLE9BQUtoRixLQUFMLENBQVdtRixRQUFYLENBQWxFLENBQVQsQ0FBTjtBQUNELE9BRkQsQ0FFRSxPQUFPM0MsRUFBUCxFQUFXO0FBQ1gsWUFBSTdELFFBQVFDLElBQVIsQ0FBYXdCLEtBQWpCLEVBQXdCO0FBQ3RCUCxrQkFBUUUsS0FBUixDQUFjeUMsRUFBZDtBQUNEO0FBQ0Q7QUFDRDtBQVZzQztBQVd4Qzs7QUFFS0ssb0JBQU4sQ0FBeUJ4RCxJQUF6QixFQUErQnNELFVBQS9CLEVBQTJDO0FBQUE7O0FBQUE7QUFDekMsWUFBTXdDLFdBQVcsT0FBS0Msb0JBQUwsQ0FBMEIvRixJQUExQixFQUFnQ3NELFVBQWhDLENBQWpCOztBQUVBLFVBQUk7QUFDRixjQUFNLE9BQUsxQyxHQUFMLENBQVMsa0JBQU8sa0RBQVAsRUFDTyxPQUFLRCxLQUFMLENBQVcsT0FBS2dGLFVBQWhCLENBRFAsRUFFTyxPQUFLaEYsS0FBTCxDQUFXbUYsUUFBWCxDQUZQLEVBR08sNEJBQWtCOUMsaUJBQWxCLENBQW9DaEQsSUFBcEMsRUFBMENzRCxVQUExQyxDQUhQLENBQVQsQ0FBTjtBQUlELE9BTEQsQ0FLRSxPQUFPSCxFQUFQLEVBQVc7QUFDWCxZQUFJN0QsUUFBUUMsSUFBUixDQUFhd0IsS0FBakIsRUFBd0I7QUFDdEJQLGtCQUFRRSxLQUFSLENBQWN5QyxFQUFkO0FBQ0Q7QUFDRDtBQUNEO0FBYndDO0FBYzFDOztBQUVENEMsdUJBQXFCL0YsSUFBckIsRUFBMkJzRCxVQUEzQixFQUF1QztBQUNyQyxVQUFNbEQsT0FBT2tELGFBQWMsR0FBRXRELEtBQUtJLElBQUssTUFBS2tELFdBQVcwQyxRQUFTLEVBQW5ELEdBQXVEaEcsS0FBS0ksSUFBekU7O0FBRUEsV0FBT0EsSUFBUDtBQUNEOztBQUVLSCxhQUFOLENBQWtCRCxJQUFsQixFQUF3QkwsT0FBeEIsRUFBaUNzRyxRQUFqQyxFQUEyQztBQUFBOztBQUFBO0FBQ3pDLFlBQU0sT0FBS2hELGtCQUFMLENBQXdCakQsSUFBeEIsRUFBOEJMLE9BQTlCLENBQU47QUFDQSxZQUFNLE9BQUs0QyxlQUFMLEVBQU47O0FBRUEsVUFBSXJDLFFBQVEsQ0FBWjs7QUFFQSxZQUFNRixLQUFLa0csY0FBTCxDQUFvQixFQUFwQjtBQUFBLHVDQUF3QixXQUFPdEUsTUFBUCxFQUFrQjtBQUM5Q0EsaUJBQU81QixJQUFQLEdBQWNBLElBQWQ7O0FBRUEsY0FBSSxFQUFFRSxLQUFGLEdBQVUsRUFBVixLQUFpQixDQUFyQixFQUF3QjtBQUN0QitGLHFCQUFTL0YsS0FBVDtBQUNEOztBQUVELGdCQUFNLE9BQUsyQixZQUFMLENBQWtCRCxNQUFsQixFQUEwQmpDLE9BQTFCLEVBQW1DLElBQW5DLENBQU47QUFDRCxTQVJLOztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQU47O0FBVUFzRyxlQUFTL0YsS0FBVDtBQWhCeUM7QUFpQjFDOztBQXVCRCxNQUFJc0YsaUJBQUosR0FBd0I7QUFDdEIsUUFBSWxHLFFBQVFDLElBQVIsQ0FBYTJGLGtCQUFqQixFQUFxQztBQUNuQyxhQUFPNUYsUUFBUUMsSUFBUixDQUFhMkYsa0JBQXBCO0FBQ0Q7O0FBRUQsVUFBTUssdUJBQ0R6RyxZQURDO0FBRUpxSCxjQUFRN0csUUFBUUMsSUFBUixDQUFhc0YsTUFBYixJQUF1Qi9GLGFBQWFFLElBRnhDO0FBR0pDLFlBQU1LLFFBQVFDLElBQVIsQ0FBYXVGLE1BQWIsSUFBdUJoRyxhQUFhRyxJQUh0QztBQUlKRixnQkFBVU8sUUFBUUMsSUFBUixDQUFhRyxVQUFiLElBQTJCWixhQUFhQyxRQUo5QztBQUtKcUgsWUFBTTlHLFFBQVFDLElBQVIsQ0FBYXdGLE1BQWIsSUFBdUJqRyxhQUFhc0gsSUFMdEM7QUFNSkMsZ0JBQVUvRyxRQUFRQyxJQUFSLENBQWF5RixVQUFiLElBQTJCbEcsYUFBYXVILFFBTjlDO0FBT0pkLGVBQVM7QUFDUGUsaUJBQVMsSUFERixDQUNPO0FBRFA7QUFQTCxNQUFOO0FBV0o7Ozs7Ozs7OztBQVNJLFdBQU9mLE9BQVA7QUFDRDs7QUFFSzlGLGdCQUFOLENBQXFCOEcsWUFBckIsRUFBbUM7QUFBQTs7QUFBQTtBQUNqQyxZQUFNaEIsVUFBVSxPQUFLQyxpQkFBckI7O0FBRUFELGNBQVF4RyxRQUFSLEdBQW1CLElBQW5CO0FBQ0EsYUFBS2tDLElBQUwsR0FBWSxNQUFNLGdCQUFNd0UsT0FBTixDQUFjRixPQUFkLENBQWxCO0FBQ0EsWUFBTTFFLE1BQU8sbUJBQWtCMEYsWUFBYSxFQUE1QztBQUNBL0YsY0FBUUMsR0FBUixDQUFZSSxHQUFaO0FBQ0EsWUFBTTJCLE9BQU8sTUFBTSxPQUFLNUIsR0FBTCxDQUFTQyxHQUFULENBQW5CO0FBUGlDO0FBUWxDO0FBblZrQixDIiwiZmlsZSI6InBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtc3NxbCBmcm9tICdtc3NxbCc7XHJcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gJ3V0aWwnO1xyXG5pbXBvcnQgTVNTUUxTY2hlbWEgZnJvbSAnLi9zY2hlbWEnO1xyXG5pbXBvcnQgeyBNU1NRTCB9IGZyb20gJ2Z1bGNydW0nO1xyXG5pbXBvcnQgTVNTUUxSZWNvcmRWYWx1ZXMgZnJvbSAnLi9tc3NxbC1yZWNvcmQtdmFsdWVzJztcclxuXHJcbmNvbnN0IE1TU1FMX0NPTkZJRyA9IHtcclxuICBkYXRhYmFzZTogJ2Z1bGNydW1hcHAnLFxyXG4gIGhvc3Q6ICdsb2NhbGhvc3QnLFxyXG4gIHBvcnQ6IDE0MzMsXHJcbiAgbWF4OiAxMCxcclxuICBpZGxlVGltZW91dE1pbGxpczogMzAwMDBcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcclxuICBhc3luYyB0YXNrKGNsaSkge1xyXG4gICAgcmV0dXJuIGNsaS5jb21tYW5kKHtcclxuICAgICAgY29tbWFuZDogJ21zc3FsJyxcclxuICAgICAgZGVzYzogJ3J1biB0aGUgTVNTUUwgc3luYyBmb3IgYSBzcGVjaWZpYyBvcmdhbml6YXRpb24nLFxyXG4gICAgICBidWlsZGVyOiB7XHJcbiAgICAgICAgbXNEYXRhYmFzZToge1xyXG4gICAgICAgICAgZGVzYzogJ21zc3FsIGRhdGFiYXNlIG5hbWUnLFxyXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICBkZWZhdWx0OiBNU1NRTF9DT05GSUcuZGF0YWJhc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1zSG9zdDoge1xyXG4gICAgICAgICAgZGVzYzogJ21zc3FsIHNlcnZlciBob3N0JyxcclxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgZGVmYXVsdDogTVNTUUxfQ09ORklHLmhvc3RcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1zUG9ydDoge1xyXG4gICAgICAgICAgZGVzYzogJ21zc3FsIHNlcnZlciBwb3J0JyxcclxuICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyJyxcclxuICAgICAgICAgIGRlZmF1bHQ6IE1TU1FMX0NPTkZJRy5wb3J0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBtc1VzZXI6IHtcclxuICAgICAgICAgIGRlc2M6ICdtc3NxbCB1c2VyJyxcclxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBtc1Bhc3N3b3JkOiB7XHJcbiAgICAgICAgICBkZXNjOiAnbXNzcWwgcGFzc3dvcmQnLFxyXG4gICAgICAgICAgdHlwZTogJ3N0cmluZydcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1zU2NoZW1hOiB7XHJcbiAgICAgICAgICBkZXNjOiAnbXNzcWwgc2NoZW1hJyxcclxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBtc0Nvbm5lY3Rpb25TdHJpbmc6IHtcclxuICAgICAgICAgIGRlc2M6ICdtc3NxbCBjb25uZWN0aW9uIHN0cmluZycsXHJcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb3JnOiB7XHJcbiAgICAgICAgICBkZXNjOiAnb3JnYW5pemF0aW9uIG5hbWUnLFxyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0dXA6IHtcclxuICAgICAgICAgIGRlc2M6ICdzZXR1cCB0aGUgZGF0YWJhc2UnLFxyXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBoYW5kbGVyOiB0aGlzLnJ1bkNvbW1hbmRcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcnVuQ29tbWFuZCA9IGFzeW5jICgpID0+IHtcclxuICAgIGF3YWl0IHRoaXMuYWN0aXZhdGUoKTtcclxuICAgIGlmIChmdWxjcnVtLmFyZ3Muc2V0dXApIHtcclxuICAgICAgYXdhaXQgdGhpcy5jcmVhdGVEYXRhYmFzZShmdWxjcnVtLmFyZ3MubXNEYXRhYmFzZSB8fCAnZnVsY3J1bWFwcCcpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IGZ1bGNydW0uZmV0Y2hBY2NvdW50KGZ1bGNydW0uYXJncy5vcmcpO1xyXG5cclxuICAgIGlmIChhY2NvdW50KSB7XHJcbiAgICAgIGNvbnN0IGZvcm1zID0gYXdhaXQgYWNjb3VudC5maW5kQWN0aXZlRm9ybXMoe30pO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShmb3JtLCBhY2NvdW50LCAoaW5kZXgpID0+IHtcclxuICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGZvcm0ubmFtZS5ncmVlbiArICcgOiAnICsgaW5kZXgudG9TdHJpbmcoKS5yZWQgKyAnIHJlY29yZHMnKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coJycpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gZmluZCBhY2NvdW50JywgZnVsY3J1bS5hcmdzLm9yZyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgdXNlU3luY0V2ZW50cygpIHtcclxuICAgIHJldHVybiBmdWxjcnVtLmFyZ3MubXNTeW5jRXZlbnRzICE9IG51bGwgPyBmdWxjcnVtLmFyZ3MubXNTeW5jRXZlbnRzIDogdHJ1ZTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGFjdGl2YXRlKCkge1xyXG4gICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMuY29ubmVjdGlvbk9wdGlvbnM7XHJcblxyXG4gICAgdGhpcy5wb29sID0gYXdhaXQgbXNzcWwuY29ubmVjdChvcHRpb25zKTtcclxuXHJcbiAgICBpZiAodGhpcy51c2VTeW5jRXZlbnRzKSB7XHJcbiAgICAvLyBmdWxjcnVtLm9uKCdjaG9pY2VfbGlzdDpzYXZlJywgdGhpcy5vbkNob2ljZUxpc3RTYXZlKTtcclxuICAgIC8vIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uX3NldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XHJcbiAgICAvLyBmdWxjcnVtLm9uKCdwcm9qZWN0OnNhdmUnLCB0aGlzLm9uUHJvamVjdFNhdmUpO1xyXG4gICAgICBmdWxjcnVtLm9uKCdyZWNvcmQ6c2F2ZScsIHRoaXMub25SZWNvcmRTYXZlKTtcclxuICAgICAgZnVsY3J1bS5vbigncmVjb3JkOmRlbGV0ZScsIHRoaXMub25SZWNvcmREZWxldGUpO1xyXG5cclxuICAgICAgLy8gZnVsY3J1bS5vbignY2hvaWNlX2xpc3Q6c2F2ZScsIHRoaXMub25DaG9pY2VMaXN0U2F2ZSk7XHJcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06c2F2ZScsIHRoaXMub25Gb3JtU2F2ZSk7XHJcbiAgICAgIGZ1bGNydW0ub24oJ2Zvcm06ZGVsZXRlJywgdGhpcy5vbkZvcm1TYXZlKTtcclxuXHJcbiAgICAgIC8vIGZ1bGNydW0ub24oJ2NsYXNzaWZpY2F0aW9uX3NldDpzYXZlJywgdGhpcy5vbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSk7XHJcbiAgICAgIC8vIGZ1bGNydW0ub24oJ3Byb2plY3Q6c2F2ZScsIHRoaXMub25Qcm9qZWN0U2F2ZSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmRhdGFTY2hlbWEgPSBmdWxjcnVtLmFyZ3MubXNTY2hlbWEgfHwgJ2Ribyc7XHJcbiAgICAvLyBGZXRjaCBhbGwgdGhlIGV4aXN0aW5nIHRhYmxlcyBvbiBzdGFydHVwLiBUaGlzIGFsbG93cyB1cyB0byBzcGVjaWFsIGNhc2UgdGhlXHJcbiAgICAvLyBjcmVhdGlvbiBvZiBuZXcgdGFibGVzIGV2ZW4gd2hlbiB0aGUgZm9ybSBpc24ndCB2ZXJzaW9uIDEuIElmIHRoZSB0YWJsZSBkb2Vzbid0XHJcbiAgICAvLyBleGlzdCwgd2UgY2FuIHByZXRlbmQgdGhlIGZvcm0gaXMgdmVyc2lvbiAxIHNvIGl0IGNyZWF0ZXMgYWxsIG5ldyB0YWJsZXMgaW5zdGVhZFxyXG4gICAgLy8gb2YgYXBwbHlpbmcgYSBzY2hlbWEgZGlmZi5cclxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLnJ1bihcIlNFTEVDVCB0YWJsZV9uYW1lIEFTIG5hbWUgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIFdIRVJFIHRhYmxlX3NjaGVtYT0nZGJvJ1wiKTtcclxuXHJcbiAgICB0aGlzLnRhYmxlTmFtZXMgPSByb3dzLm1hcChvID0+IG8ubmFtZSk7XHJcblxyXG4gICAgLy8gbWFrZSBhIGNsaWVudCBzbyB3ZSBjYW4gdXNlIGl0IHRvIGJ1aWxkIFNRTCBzdGF0ZW1lbnRzXHJcbiAgICB0aGlzLm1zc3FsID0gbmV3IE1TU1FMKHt9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGRlYWN0aXZhdGUoKSB7XHJcbiAgICBpZiAodGhpcy5wb29sKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMucG9vbC5jbG9zZSgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWRlbnQgPSAobmFtZSkgPT4ge1xyXG4gICAgcmV0dXJuICdbJyArIG5hbWUgKyAnXSc7XHJcbiAgfVxyXG5cclxuICBydW4gPSBhc3luYyAoc3FsKSA9PiB7XHJcbiAgICBzcWwgPSBzcWwucmVwbGFjZSgvXFwwL2csICcnKTtcclxuXHJcbiAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKHNxbCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wb29sLnJlcXVlc3QoKS5iYXRjaChzcWwpO1xyXG5cclxuICAgIHJldHVybiByZXN1bHQucmVjb3Jkc2V0O1xyXG4gIH1cclxuXHJcbiAgbG9nID0gKC4uLmFyZ3MpID0+IHtcclxuICAgIC8vIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xyXG4gIH1cclxuXHJcbiAgdGFibGVOYW1lID0gKGFjY291bnQsIG5hbWUpID0+IHtcclxuICAgIHJldHVybiAnYWNjb3VudF8nICsgYWNjb3VudC5yb3dJRCArICdfJyArIG5hbWU7XHJcbiAgfVxyXG5cclxuICBvbkZvcm1TYXZlID0gYXN5bmMgKHtmb3JtLCBhY2NvdW50LCBvbGRGb3JtLCBuZXdGb3JtfSkgPT4ge1xyXG4gICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xyXG4gIH1cclxuXHJcbiAgb25SZWNvcmRTYXZlID0gYXN5bmMgKHtyZWNvcmQsIGFjY291bnR9KSA9PiB7XHJcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVJlY29yZChyZWNvcmQsIGFjY291bnQpO1xyXG4gIH1cclxuXHJcbiAgb25SZWNvcmREZWxldGUgPSBhc3luYyAoe3JlY29yZH0pID0+IHtcclxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBNU1NRTFJlY29yZFZhbHVlcy5kZWxldGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMubXNzcWwsIHJlY29yZCwgcmVjb3JkLmZvcm0pO1xyXG5cclxuICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHN0YXRlbWVudHMpIHtcclxuICAgICAgYXdhaXQgdGhpcy5ydW4oc3RhdGVtZW50LnNxbCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbkNob2ljZUxpc3RTYXZlID0gYXN5bmMgKHtvYmplY3R9KSA9PiB7XHJcbiAgfVxyXG5cclxuICBvbkNsYXNzaWZpY2F0aW9uU2V0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xyXG4gIH1cclxuXHJcbiAgb25Qcm9qZWN0U2F2ZSA9IGFzeW5jICh7b2JqZWN0fSkgPT4ge1xyXG4gIH1cclxuXHJcbiAgcmVsb2FkVGFibGVMaXN0ID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMucnVuKFwiU0VMRUNUIHRhYmxlX25hbWUgQVMgbmFtZSBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMgV0hFUkUgdGFibGVfc2NoZW1hPSdwdWJsaWMnXCIpO1xyXG5cclxuICAgIHRoaXMudGFibGVOYW1lcyA9IHJvd3MubWFwKG8gPT4gby5uYW1lKTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVJlY29yZCA9IGFzeW5jIChyZWNvcmQsIGFjY291bnQsIHNraXBUYWJsZUNoZWNrKSA9PiB7XHJcbiAgICBpZiAoIXNraXBUYWJsZUNoZWNrICYmICF0aGlzLnJvb3RUYWJsZUV4aXN0cyhyZWNvcmQuZm9ybSkpIHtcclxuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkRm9ybShyZWNvcmQuZm9ybSwgYWNjb3VudCwgKCkgPT4ge30pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBNU1NRTFJlY29yZFZhbHVlcy51cGRhdGVGb3JSZWNvcmRTdGF0ZW1lbnRzKHRoaXMubXNzcWwsIHJlY29yZCk7XHJcblxyXG4vL2NvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqKioqKioqKiBTdGFydCB1cGRhdGVSZWNvcmQgKioqKioqKioqKioqKioqKioqKioqKionKTtcclxuICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHN0YXRlbWVudHMpIHtcclxuLy9jb25zb2xlLmxvZyhzdGF0ZW1lbnQpO1xyXG4gICAgICBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnQuc3FsKTtcclxuICAgIH1cclxuLy9jb25zb2xlLmxvZygnKioqKioqKioqKioqKioqKioqKioqKioqIEVuZCB1cGRhdGVSZWNvcmQgKioqKioqKioqKioqKioqKioqKioqKioqJyk7XHJcbiAgfVxyXG5cclxuICByb290VGFibGVFeGlzdHMgPSAoZm9ybSkgPT4ge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGVOYW1lcy5pbmRleE9mKE1TU1FMUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0pKSAhPT0gLTE7XHJcbiAgfVxyXG5cclxuICByZWNyZWF0ZUZvcm1UYWJsZXMgPSBhc3luYyAoZm9ybSwgYWNjb3VudCkgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVGb3JtKGZvcm0sIGFjY291bnQsIHRoaXMuZm9ybVZlcnNpb24oZm9ybSksIG51bGwpO1xyXG4gICAgfSBjYXRjaCAoZXgpIHtcclxuICAgICAgaWYgKGZ1bGNydW0uYXJncy5kZWJ1Zykge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3FsKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IHRoaXMudXBkYXRlRm9ybShmb3JtLCBhY2NvdW50LCBudWxsLCB0aGlzLmZvcm1WZXJzaW9uKGZvcm0pKTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUZvcm0gPSBhc3luYyAoZm9ybSwgYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkgPT4ge1xyXG4gICAgaWYgKCF0aGlzLnJvb3RUYWJsZUV4aXN0cyhmb3JtKSAmJiBuZXdGb3JtICE9IG51bGwpIHtcclxuICAgICAgb2xkRm9ybSA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qge3N0YXRlbWVudHN9ID0gYXdhaXQgTVNTUUxTY2hlbWEuZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzKGFjY291bnQsIG9sZEZvcm0sIG5ld0Zvcm0pO1xyXG5cclxuICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHNxbCBvZiBzdGF0ZW1lbnRzKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMucnVuKHNxbCk7XHJcbiAgICB9XHJcbiAgICAvLyBhd2FpdCB0aGlzLnJ1bihzdGF0ZW1lbnRzLmpvaW4oJ1xcbicpKTtcclxuXHJcbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUZyaWVuZGx5Vmlldyhmb3JtLCBudWxsKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHJlcGVhdGFibGUgb2YgZm9ybS5lbGVtZW50c09mVHlwZSgnUmVwZWF0YWJsZScpKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZHJvcEZyaWVuZGx5Vmlldyhmb3JtLCByZXBlYXRhYmxlKSB7XHJcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0RnJpZW5kbHlUYWJsZU5hbWUoZm9ybSwgcmVwZWF0YWJsZSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdGhpcy5ydW4oZm9ybWF0KCdEUk9QIFZJRVcgSUYgRVhJU1RTICVzLiVzOycsIHRoaXMuaWRlbnQodGhpcy5kYXRhU2NoZW1hKSwgdGhpcy5pZGVudCh2aWV3TmFtZSkpKTtcclxuICAgIH0gY2F0Y2ggKGV4KSB7XHJcbiAgICAgIGlmIChmdWxjcnVtLmFyZ3MuZGVidWcpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGV4KTtcclxuICAgICAgfVxyXG4gICAgICAvLyBzb21ldGltZXMgaXQgZG9lc24ndCBleGlzdFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgY3JlYXRlRnJpZW5kbHlWaWV3KGZvcm0sIHJlcGVhdGFibGUpIHtcclxuICAgIGNvbnN0IHZpZXdOYW1lID0gdGhpcy5nZXRGcmllbmRseVRhYmxlTmFtZShmb3JtLCByZXBlYXRhYmxlKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLnJ1bihmb3JtYXQoJ0NSRUFURSBWSUVXICVzLiVzIEFTIFNFTEVDVCAqIEZST00gJXNfdmlld19mdWxsOycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlkZW50KHRoaXMuZGF0YVNjaGVtYSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlkZW50KHZpZXdOYW1lKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1TU1FMUmVjb3JkVmFsdWVzLnRhYmxlTmFtZVdpdGhGb3JtKGZvcm0sIHJlcGVhdGFibGUpKSk7XHJcbiAgICB9IGNhdGNoIChleCkge1xyXG4gICAgICBpZiAoZnVsY3J1bS5hcmdzLmRlYnVnKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihleCk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gc29tZXRpbWVzIGl0IGRvZXNuJ3QgZXhpc3RcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldEZyaWVuZGx5VGFibGVOYW1lKGZvcm0sIHJlcGVhdGFibGUpIHtcclxuICAgIGNvbnN0IG5hbWUgPSByZXBlYXRhYmxlID8gYCR7Zm9ybS5uYW1lfSAtICR7cmVwZWF0YWJsZS5kYXRhTmFtZX1gIDogZm9ybS5uYW1lO1xyXG5cclxuICAgIHJldHVybiBuYW1lO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVidWlsZEZvcm0oZm9ybSwgYWNjb3VudCwgcHJvZ3Jlc3MpIHtcclxuICAgIGF3YWl0IHRoaXMucmVjcmVhdGVGb3JtVGFibGVzKGZvcm0sIGFjY291bnQpO1xyXG4gICAgYXdhaXQgdGhpcy5yZWxvYWRUYWJsZUxpc3QoKTtcclxuXHJcbiAgICBsZXQgaW5kZXggPSAwO1xyXG5cclxuICAgIGF3YWl0IGZvcm0uZmluZEVhY2hSZWNvcmQoe30sIGFzeW5jIChyZWNvcmQpID0+IHtcclxuICAgICAgcmVjb3JkLmZvcm0gPSBmb3JtO1xyXG5cclxuICAgICAgaWYgKCsraW5kZXggJSAxMCA9PT0gMCkge1xyXG4gICAgICAgIHByb2dyZXNzKGluZGV4KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVSZWNvcmQocmVjb3JkLCBhY2NvdW50LCB0cnVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHByb2dyZXNzKGluZGV4KTtcclxuICB9XHJcblxyXG4gIGZvcm1WZXJzaW9uID0gKGZvcm0pID0+IHtcclxuICAgIGlmIChmb3JtID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaWQ6IGZvcm0uX2lkLFxyXG4gICAgICByb3dfaWQ6IGZvcm0ucm93SUQsXHJcbiAgICAgIG5hbWU6IGZvcm0uX25hbWUsXHJcbiAgICAgIGVsZW1lbnRzOiBmb3JtLl9lbGVtZW50c0pTT05cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTdGF0dXMgPSAobWVzc2FnZSkgPT4ge1xyXG4gICAgaWYgKHByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XHJcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgpO1xyXG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtcclxuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgY29ubmVjdGlvbk9wdGlvbnMoKSB7XHJcbiAgICBpZiAoZnVsY3J1bS5hcmdzLm1zQ29ubmVjdGlvblN0cmluZykge1xyXG4gICAgICByZXR1cm4gZnVsY3J1bS5hcmdzLm1zQ29ubmVjdGlvblN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBvcHRpb25zID0ge1xyXG4gICAgICAuLi5NU1NRTF9DT05GSUcsXHJcbiAgICAgIHNlcnZlcjogZnVsY3J1bS5hcmdzLm1zSG9zdCB8fCBNU1NRTF9DT05GSUcuaG9zdCxcclxuICAgICAgcG9ydDogZnVsY3J1bS5hcmdzLm1zUG9ydCB8fCBNU1NRTF9DT05GSUcucG9ydCxcclxuICAgICAgZGF0YWJhc2U6IGZ1bGNydW0uYXJncy5tc0RhdGFiYXNlIHx8IE1TU1FMX0NPTkZJRy5kYXRhYmFzZSxcclxuICAgICAgdXNlcjogZnVsY3J1bS5hcmdzLm1zVXNlciB8fCBNU1NRTF9DT05GSUcudXNlcixcclxuICAgICAgcGFzc3dvcmQ6IGZ1bGNydW0uYXJncy5tc1Bhc3N3b3JkIHx8IE1TU1FMX0NPTkZJRy5wYXNzd29yZCxcclxuICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgIGVuY3J5cHQ6IHRydWUgLy8gVXNlIHRoaXMgaWYgeW91J3JlIG9uIFdpbmRvd3MgQXp1cmVcclxuICAgICAgfVxyXG4gICAgfTtcclxuLypcclxuICAgIGlmIChmdWxjcnVtLmFyZ3MubXNVc2VyKSB7XHJcbiAgICAgIG9wdGlvbnMudXNlciA9IGZ1bGNydW0uYXJncy5tc1VzZXI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZ1bGNydW0uYXJncy5tc1Bhc3N3b3JkKSB7XHJcbiAgICAgIG9wdGlvbnMucGFzc3dvcmQgPSBmdWxjcnVtLmFyZ3MubXNQYXNzd29yZDtcclxuICAgIH1cclxuKi9cclxuICAgIHJldHVybiBvcHRpb25zO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgY3JlYXRlRGF0YWJhc2UoZGF0YWJhc2VOYW1lKSB7XHJcbiAgICBjb25zdCBvcHRpb25zID0gdGhpcy5jb25uZWN0aW9uT3B0aW9ucztcclxuXHJcbiAgICBvcHRpb25zLmRhdGFiYXNlID0gbnVsbDtcclxuICAgIHRoaXMucG9vbCA9IGF3YWl0IG1zc3FsLmNvbm5lY3Qob3B0aW9ucylcclxuICAgIGNvbnN0IHNxbCA9IGBDUkVBVEUgREFUQUJBU0UgJHtkYXRhYmFzZU5hbWV9YDtcclxuICAgIGNvbnNvbGUubG9nKHNxbCk7XHJcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5ydW4oc3FsKTtcclxuICB9XHJcbn1cclxuIl19