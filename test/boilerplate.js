/**
 * Created by admin on 03/07/2016.
 */
var
    assert = require('assert'),
    config = require('./test-config'),
    supp = require('../demo-support'),
    fs = require('fs');

function TestHelper(native, cstr) {

    var conn_str = cstr;
    var sql = native;
    var support = new supp.DemoSupport(sql, cstr);
    var async = new support.Async();

    function testBoilerPlate(params, doneFunction) {

        var name = params.name;
        var type = params.type;
        var conn;

        function readFile(f, done) {
            fs.readFile(f, 'utf8', function (err, data) {
                if (err) {
                    done(err);
                } else
                    done(data);
            });
        }

        var sequence = [

            function (async_done) {
                sql.open(conn_str, function (err, c) {
                    assert.ifError(err);
                    conn = c;
                    async_done();
                });
            },

            function (async_done) {
                var dropSql = "DROP TABLE " + name;
                conn.query(dropSql, function () {
                    async_done();
                });
            },

            function (async_done) {
                var folder = __dirname;
                var file = folder + '/sql/' + name;
                file += '.sql';

                function inChunks(arr, callback) {
                    var i = 0;
                    conn.query(arr[i], next);
                    function next(err, res) {
                        assert.ifError(err);
                        assert(res.length === 0);
                        ++i;
                        if (i < arr.length)
                            conn.query(arr[i], next);
                        else callback();
                    }
                }

                // submit the SQL one chunk at a time to create table with constraints.
                readFile(file, function (createSql) {
                    createSql = createSql.replace(/<name>/g, name);
                    createSql = createSql.replace(/<type>/g, type);
                    var arr = createSql.split("GO");
                    for (var i = 0; i < arr.length; ++i) {
                        arr[i] = arr[i].replace(/^\s+|\s+$/g, '');
                    }
                    inChunks(arr, function () {
                        async_done();
                    });
                });
            },
            function (async_done) {
                conn.close(function () {
                    async_done();
                })
            },
        ];

        async.series(sequence,
            function () {
                doneFunction();
            });
    }

    function getJSON() {
        var folder = __dirname;
        var fs = require('fs');
        var parsedJSON = JSON.parse(fs.readFileSync(folder + '/employee.json', 'utf8'));

        for (var i = 0; i < parsedJSON.length; ++i) {
            parsedJSON[i].OrganizationNode = new Buffer(parsedJSON[i].OrganizationNode.data, 'utf8');
            parsedJSON[i].BirthDate = new Date(parsedJSON[i].BirthDate);
            parsedJSON[i].HireDate = new Date(parsedJSON[i].HireDate);
            parsedJSON[i].ModifiedDate = new Date(parsedJSON[i].ModifiedDate);
        }
        return parsedJSON;
    }

    this.testBoilerPlate = testBoilerPlate;
    this.getJSON = getJSON;

    return this;
}

exports.TestHelper = TestHelper;
