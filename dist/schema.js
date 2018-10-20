'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _schema = require('fulcrum-schema/dist/schema');

var _schema2 = _interopRequireDefault(_schema);

var _sqldiff = require('sqldiff');

var _sqldiff2 = _interopRequireDefault(_sqldiff);

var _mssqlSchema = require('./mssql-schema');

var _mssqlSchema2 = _interopRequireDefault(_mssqlSchema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const { SchemaDiffer, MSSQL } = _sqldiff2.default;

class MSSQLSchema {
    static generateSchemaStatements(account, oldForm, newForm) {
        return _asyncToGenerator(function* () {
            let oldSchema = null;
            let newSchema = null;

            if (oldForm) {
                oldSchema = new _schema2.default(oldForm, _mssqlSchema2.default, null);
            }

            if (newForm) {
                newSchema = new _schema2.default(newForm, _mssqlSchema2.default, null);
            }

            const differ = new SchemaDiffer(oldSchema, newSchema);
            const generator = new MSSQL(differ, { afterTransform: null });

            generator.tablePrefix = 'account_' + account.rowID + '_';

            const statements = generator.generate();

            return { statements, oldSchema, newSchema };
        })();
    }
}
exports.default = MSSQLSchema;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NjaGVtYS5qcyJdLCJuYW1lcyI6WyJTY2hlbWFEaWZmZXIiLCJNU1NRTCIsIk1TU1FMU2NoZW1hIiwiZ2VuZXJhdGVTY2hlbWFTdGF0ZW1lbnRzIiwiYWNjb3VudCIsIm9sZEZvcm0iLCJuZXdGb3JtIiwib2xkU2NoZW1hIiwibmV3U2NoZW1hIiwiZGlmZmVyIiwiZ2VuZXJhdG9yIiwiYWZ0ZXJUcmFuc2Zvcm0iLCJ0YWJsZVByZWZpeCIsInJvd0lEIiwic3RhdGVtZW50cyIsImdlbmVyYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsTUFBTSxFQUFDQSxZQUFELEVBQWVDLEtBQWYsc0JBQU47O0FBRWUsTUFBTUMsV0FBTixDQUFrQjtBQUMvQixXQUFhQyx3QkFBYixDQUFzQ0MsT0FBdEMsRUFBK0NDLE9BQS9DLEVBQXdEQyxPQUF4RCxFQUFpRTtBQUFBO0FBQy9ELGdCQUFJQyxZQUFZLElBQWhCO0FBQ0EsZ0JBQUlDLFlBQVksSUFBaEI7O0FBRUEsZ0JBQUlILE9BQUosRUFBYTtBQUNYRSw0QkFBWSxxQkFBV0YsT0FBWCx5QkFBOEIsSUFBOUIsQ0FBWjtBQUNEOztBQUVELGdCQUFJQyxPQUFKLEVBQWE7QUFDWEUsNEJBQVkscUJBQVdGLE9BQVgseUJBQThCLElBQTlCLENBQVo7QUFDRDs7QUFFRCxrQkFBTUcsU0FBUyxJQUFJVCxZQUFKLENBQWlCTyxTQUFqQixFQUE0QkMsU0FBNUIsQ0FBZjtBQUNBLGtCQUFNRSxZQUFZLElBQUlULEtBQUosQ0FBVVEsTUFBVixFQUFrQixFQUFDRSxnQkFBZ0IsSUFBakIsRUFBbEIsQ0FBbEI7O0FBRUFELHNCQUFVRSxXQUFWLEdBQXdCLGFBQWFSLFFBQVFTLEtBQXJCLEdBQTZCLEdBQXJEOztBQUVBLGtCQUFNQyxhQUFhSixVQUFVSyxRQUFWLEVBQW5COztBQUVBLG1CQUFPLEVBQUNELFVBQUQsRUFBYVAsU0FBYixFQUF3QkMsU0FBeEIsRUFBUDtBQW5CK0Q7QUFvQmhFO0FBckI4QjtrQkFBWk4sVyIsImZpbGUiOiJzY2hlbWEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU2NoZW1hIGZyb20gJ2Z1bGNydW0tc2NoZW1hL2Rpc3Qvc2NoZW1hJztcclxuaW1wb3J0IHNxbGRpZmYgZnJvbSAnc3FsZGlmZic7XHJcbmltcG9ydCBNU1NjaGVtYSBmcm9tICcuL21zc3FsLXNjaGVtYSc7XHJcblxyXG5jb25zdCB7U2NoZW1hRGlmZmVyLCBNU1NRTH0gPSBzcWxkaWZmO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTVNTUUxTY2hlbWEge1xyXG4gIHN0YXRpYyBhc3luYyBnZW5lcmF0ZVNjaGVtYVN0YXRlbWVudHMoYWNjb3VudCwgb2xkRm9ybSwgbmV3Rm9ybSkge1xyXG4gICAgbGV0IG9sZFNjaGVtYSA9IG51bGw7XHJcbiAgICBsZXQgbmV3U2NoZW1hID0gbnVsbDtcclxuXHJcbiAgICBpZiAob2xkRm9ybSkge1xyXG4gICAgICBvbGRTY2hlbWEgPSBuZXcgU2NoZW1hKG9sZEZvcm0sIE1TU2NoZW1hLCBudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobmV3Rm9ybSkge1xyXG4gICAgICBuZXdTY2hlbWEgPSBuZXcgU2NoZW1hKG5ld0Zvcm0sIE1TU2NoZW1hLCBudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkaWZmZXIgPSBuZXcgU2NoZW1hRGlmZmVyKG9sZFNjaGVtYSwgbmV3U2NoZW1hKTtcclxuICAgIGNvbnN0IGdlbmVyYXRvciA9IG5ldyBNU1NRTChkaWZmZXIsIHthZnRlclRyYW5zZm9ybTogbnVsbH0pO1xyXG5cclxuICAgIGdlbmVyYXRvci50YWJsZVByZWZpeCA9ICdhY2NvdW50XycgKyBhY2NvdW50LnJvd0lEICsgJ18nO1xyXG5cclxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBnZW5lcmF0b3IuZ2VuZXJhdGUoKTtcclxuXHJcbiAgICByZXR1cm4ge3N0YXRlbWVudHMsIG9sZFNjaGVtYSwgbmV3U2NoZW1hfTtcclxuICB9XHJcbn1cclxuIl19