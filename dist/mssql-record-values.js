'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require('util');

var _fulcrumDesktopPlugin = require('fulcrum-desktop-plugin');

var _lodash = require('lodash');

class MSSQLRecordValues extends _fulcrumDesktopPlugin.RecordValues {
  static setupSearch(values, feature) {
    const searchableValue = feature.searchableValue;

    values.record_index_text = searchableValue;

    const strings = (0, _lodash.compact)(feature.formValues.all.map(o => o.searchableValue && o.searchableValue.trim()));

    values.record_index = JSON.stringify(strings);

    return values;
  }

  static setupPoint(values, latitude, longitude) {
    const wkt = (0, _util.format)('POINT(%s %s)', longitude, latitude);
    return { raw: `geography::STGeomFromText('${wkt}', 4326)` };
  }
}
exports.default = MSSQLRecordValues;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL21zc3FsLXJlY29yZC12YWx1ZXMuanMiXSwibmFtZXMiOlsiTVNTUUxSZWNvcmRWYWx1ZXMiLCJzZXR1cFNlYXJjaCIsInZhbHVlcyIsImZlYXR1cmUiLCJzZWFyY2hhYmxlVmFsdWUiLCJyZWNvcmRfaW5kZXhfdGV4dCIsInN0cmluZ3MiLCJmb3JtVmFsdWVzIiwiYWxsIiwibWFwIiwibyIsInRyaW0iLCJyZWNvcmRfaW5kZXgiLCJKU09OIiwic3RyaW5naWZ5Iiwic2V0dXBQb2ludCIsImxhdGl0dWRlIiwibG9uZ2l0dWRlIiwid2t0IiwicmF3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFFZSxNQUFNQSxpQkFBTiw0Q0FBNkM7QUFDMUQsU0FBT0MsV0FBUCxDQUFtQkMsTUFBbkIsRUFBMkJDLE9BQTNCLEVBQW9DO0FBQ2xDLFVBQU1DLGtCQUFrQkQsUUFBUUMsZUFBaEM7O0FBRUFGLFdBQU9HLGlCQUFQLEdBQTJCRCxlQUEzQjs7QUFFQSxVQUFNRSxVQUFVLHFCQUFRSCxRQUFRSSxVQUFSLENBQW1CQyxHQUFuQixDQUF1QkMsR0FBdkIsQ0FBMkJDLEtBQUtBLEVBQUVOLGVBQUYsSUFBcUJNLEVBQUVOLGVBQUYsQ0FBa0JPLElBQWxCLEVBQXJELENBQVIsQ0FBaEI7O0FBRUFULFdBQU9VLFlBQVAsR0FBc0JDLEtBQUtDLFNBQUwsQ0FBZVIsT0FBZixDQUF0Qjs7QUFFQSxXQUFPSixNQUFQO0FBQ0Q7O0FBRUQsU0FBT2EsVUFBUCxDQUFrQmIsTUFBbEIsRUFBMEJjLFFBQTFCLEVBQW9DQyxTQUFwQyxFQUErQztBQUM3QyxVQUFNQyxNQUFNLGtCQUFPLGNBQVAsRUFBdUJELFNBQXZCLEVBQWtDRCxRQUFsQyxDQUFaO0FBQ0EsV0FBTyxFQUFDRyxLQUFNLDhCQUE4QkQsR0FBSyxVQUExQyxFQUFQO0FBQ0Q7QUFoQnlEO2tCQUF2Q2xCLGlCIiwiZmlsZSI6Im1zc3FsLXJlY29yZC12YWx1ZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCB7IFJlY29yZFZhbHVlcyB9IGZyb20gJ2Z1bGNydW0nO1xuaW1wb3J0IHsgY29tcGFjdCB9IGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1TU1FMUmVjb3JkVmFsdWVzIGV4dGVuZHMgUmVjb3JkVmFsdWVzIHtcbiAgc3RhdGljIHNldHVwU2VhcmNoKHZhbHVlcywgZmVhdHVyZSkge1xuICAgIGNvbnN0IHNlYXJjaGFibGVWYWx1ZSA9IGZlYXR1cmUuc2VhcmNoYWJsZVZhbHVlO1xuXG4gICAgdmFsdWVzLnJlY29yZF9pbmRleF90ZXh0ID0gc2VhcmNoYWJsZVZhbHVlO1xuXG4gICAgY29uc3Qgc3RyaW5ncyA9IGNvbXBhY3QoZmVhdHVyZS5mb3JtVmFsdWVzLmFsbC5tYXAobyA9PiBvLnNlYXJjaGFibGVWYWx1ZSAmJiBvLnNlYXJjaGFibGVWYWx1ZS50cmltKCkpKTtcblxuICAgIHZhbHVlcy5yZWNvcmRfaW5kZXggPSBKU09OLnN0cmluZ2lmeShzdHJpbmdzKTtcblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH1cblxuICBzdGF0aWMgc2V0dXBQb2ludCh2YWx1ZXMsIGxhdGl0dWRlLCBsb25naXR1ZGUpIHtcbiAgICBjb25zdCB3a3QgPSBmb3JtYXQoJ1BPSU5UKCVzICVzKScsIGxvbmdpdHVkZSwgbGF0aXR1ZGUpO1xuICAgIHJldHVybiB7cmF3OiBgZ2VvZ3JhcGh5OjpTVEdlb21Gcm9tVGV4dCgnJHsgd2t0IH0nLCA0MzI2KWB9O1xuICB9XG59XG5cbiJdfQ==