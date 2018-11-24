// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
// ###数据源实施
//
// -------------------
//这里我们实现了实际的数据源插件。我们传入设置和updateCallback。
(function () {
    //json格式的数据源(原始的)
    var jsonDatasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }

            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }

            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }

            var body = currentSettings.body;

            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }

            $.ajax({
                url: requestURL,
                dataType: (errorStage == 1) ? "JSONP" : "JSON",
                type: currentSettings.method || "GET",
                data: body,
                beforeSend: function (xhr) {
                    try {
                        _.each(currentSettings.headers, function (header) {
                            var name = header.name;
                            var value = header.value;

                            if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                xhr.setRequestHeader(name, value);
                            }
                        });
                    }
                    catch (e) {
                    }
                },
                success: function (data) {
                    lockErrorStage = true;
                    updateCallback(data);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new jsonDatasource(settings, updateCallback));
        }
    });
    //json格式的数据源（测试1 第一张图 右中）
    var json11Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }

            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }

            var body = currentSettings.body;

            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }

            $.ajax({
                url: requestURL,
                dataType: (errorStage == 1) ? "JSONP" : "JSON",
                type: currentSettings.method || "GET",
                data: body,
                beforeSend: function (xhr) {
                    try {
                        _.each(currentSettings.headers, function (header) {
                            var name = header.name;
                            var value = header.value;

                            if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                xhr.setRequestHeader(name, value);
                            }
                        });
                    }
                    catch (e) {
                    }
                },
                success: function (data) {
                    lockErrorStage = true;
                    var gCount =data;
                    var MOCount = [];
                    for ( var key in gCount[0]) {
                        if (key == "host") {
                            MOCount.push({
                                "name" : "主机",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#00fefc"
                                    }
                                }
                            })
                        } else if (key == "database") {
                            MOCount.push({
                                "name" : "数据库",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#48bec8"
                                    }
                                }
                            })
                        } else if (key == "network") {
                            MOCount.push({
                                "name" : "网络",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#1b5f71"
                                    }
                                }

                            })
                        } else if (key == "service") {
                            MOCount.push({
                                "name" : "标准应用",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#ffffff"
                                    }
                                }
                            })
                        }

                    }
                    updateCallback(MOCount);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON11",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json11Datasource(settings, updateCallback));
        }
    });
    //json格式的数据源 （自定的  用于发送两次ajax请求  请求数据和返回数据都为json格式）
    var json2Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            var requestURL2 = currentSettings.url2;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url2);
            }
            var body = currentSettings.body;
            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }
            var resdata;
            $.ajax({
                async: false,
                url: requestURL,
                dataType: (errorStage == 1) ? "JSONP" : "JSON",
                type: currentSettings.method || "GET",
                data: body,
                beforeSend: function (xhr) {
                    try {
                        _.each(currentSettings.headers, function (header) {
                            var name = header.name;
                            var value = header.value;
                            if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                xhr.setRequestHeader(name, value);
                            }
                        });
                    }
                    catch (e) {
                    }
                },
                success: function (data1) {
                    lockErrorStage = true;
                    resdata = data1;
                    //updateCallback(data);
                    req();
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });

            //定义第二次发送的ajax请求
            function req() {
                $.ajax({
                    url: requestURL2,
                    dataType: (errorStage == 1) ? "JSONP" : "JSON",
                    type: currentSettings.method || "GET",
                    data: body,
                    beforeSend: function (xhr) {
                        try {
                            _.each(currentSettings.headers, function (header) {
                                var name = header.name;
                                var value = header.value;

                                if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                    xhr.setRequestHeader(name, value);
                                }
                            });
                        }
                        catch (e) {
                        }
                    },
                    success: function (data2) {
                        lockErrorStage = true;
                        //在此处应该对两次请求返回的数据进行处理 因还不清楚返回的数据都有什么 所以还未做处理
                        //updateCallback(resdata);
                        //resdata=data2;
                        updateCallback(resdata);
                    },
                    error: function (xhr, status, error) {
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }
        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON1",
        display_name: "JSON1",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                name: "url2",
                display_name: "URL2",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json2Datasource(settings, updateCallback));
        }
    });
    //json格式的数据源 （测试2 第一张图 左下 基于场景三的测试 两次ajax请求）
    var json21Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            var requestURL2 = currentSettings.url2;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url2);
            }
            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            $.ajax({
                async: false,
                url: "http://localhost:3100/DataSource2.json",
                //http://121.43.229.26:8082/query/mo/WinDisk?where=uuid='00300024'
                dataType: "JSON",
                type:"GET",
                success: function (data) {
                    lockErrorStage = true;
                    //在此处对第一次请求到的数据做处理 （问题1：指标的参数在哪里接收 在这里是定死的 指标为cpu使用率 问题2：需要指定具体的uuid 在哪里接收 在这里是定死的 uuid为0030008c）
                    var jsonArry=data;
                    var  propertie;
                    var resultOne=[];
                    for(var i=0;i<jsonArry.length;i++){
                        propertie=jsonArry[i].properties;
                        var jsonStr='{';
                        $.each(propertie, function (i, item) {
                            if(item.name=="id"){
                                jsonStr=jsonStr+'\"id\":'+'\"'+item.value.value+'\"';
                            }
                            else if(item.name=="name"){
                                jsonStr=jsonStr+","+'\"name\":'+'\"'+item.value.value+'\"';
                            }
                            else if(item.name=="uuid"){
                                jsonStr=jsonStr+","+'\"uuid\":'+'\"'+item.value.value+'\"';
                            }
                        });
                        jsonStr=jsonStr+"}";
                        jsonStr=JSON.parse(jsonStr);
                        resultOne.push(jsonStr);
                    }
                    //console.log(resultOne);
                    //updateCallback(data);
                    req(resultOne);
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
            //定义第二次发送的ajax请求
            function req(resultOne) {
                var objectType="WinDisk";
                var indexType="UsedPer";
                var body = [];
                var result1=resultOne;
                for(var i=0;i<result1.length;i++){
                    var jsonStr= {
                        "name": "Metrics",
                        "localName": "",
                        "properties": [
                            {
                                "name": "moPath",
                                "localName": "moPath",
                                "originClass": "Metrics",
                                "overridingProperty": null,
                                "key": true,
                                "propagated": true,
                                "type": {
                                    "type": 8,
                                    "refClassName": null
                                },
                                "value": {
                                    "value":"WinDisk.id=\""+result1[i].id+"\",name=\""+result1[i].name+"\",uuid=\""+result1[i].uuid+"\""
                                }
                            },
                            {
                                "name": "name",
                                "localName": "name",
                                "originClass": "Metrics",
                                "overridingProperty": null,
                                "key": true,
                                "propagated": true,
                                "type": {
                                    "type": 8,
                                    "refClassName": null
                                },
                                "value": {
                                    "value":""+indexType+""
                                }
                            },
                            {
                                "name": "definition",
                                "localName": "definition",
                                "originClass": "Metrics",
                                "overridingProperty": null,
                                "key": false,
                                "propagated": true,
                                "type": {
                                    "type": 8,
                                    "refClassName": null
                                },
                                "value": {
                                    "value": "MetricsDefinition.mo=\""+objectType+"\",name=\""+indexType+"\""
                                }
                            }
                        ],
                        "children": [],
                        "className": "Metrics",
                        "alias": "",
                        "cimid": null
                    }

                    body.push(jsonStr);
                }
               // console.log(body);
                $.ajax({
                    url:"http://localhost:3100/DataSource3.json",
                    //http://121.43.229.26:8082/batch/metrics?fresh=1860
                    dataType:  "JSON",
                    type:"get",
                    data: body,
                    success: function (data) {
                        lockErrorStage = true;
                        console.log(data);
                        //此处对第二次请求的结果进行处理

                        //resdata=data2;
                        updateCallback(resdata);
                    },
                    error: function (xhr, status, error) {
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }
        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON21",
        display_name: "JSON21",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                name: "url2",
                display_name: "URL2",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json21Datasource(settings, updateCallback));
        }
    });
    //json连接自己后台的测试(问题部分)
    var json3Datasource = function (settings, updateCallback) {

        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/bar/singleBar",
                dataType: "text",
                type: "get" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                },
                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                success: function (data) {
                    console.log("请求成功");
                    var data1 = eval('(' + data + ')');
                    var obj=JSON.parse(data1);
                    console.log(obj);
                    lockErrorStage = true;
                   // data=JSON.stringify(data);
                    //console.log(data);
                    updateCallback(obj);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON3",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json3Datasource(settings, updateCallback));
        }
    });

    // Open Weather Map Api格式的数据源
    var openWeatherMapDatasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }

            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        function toTitleCase(str) {
            return str.replace(/\w\S*/g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        }

        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            $.ajax({
                url: "http://api.openweathermap.org/data/2.5/weather?APPID=" + currentSettings.api_key + "&q=" + encodeURIComponent(currentSettings.location) + "&units=" + currentSettings.units,
                dataType: "JSONP",
                success: function (data) {
                    // Rejigger our data into something easier to understand
                    var newData = {
                        place_name: data.name,
                        sunrise: (new Date(data.sys.sunrise * 1000)).toLocaleTimeString(),
                        sunset: (new Date(data.sys.sunset * 1000)).toLocaleTimeString(),
                        conditions: toTitleCase(data.weather[0].description),
                        current_temp: data.main.temp,
                        high_temp: data.main.temp_max,
                        low_temp: data.main.temp_min,
                        pressure: data.main.pressure,
                        humidity: data.main.humidity,
                        wind_speed: data.wind.speed,
                        wind_direction: data.wind.deg
                    };

                    updateCallback(newData);
                },
                error: function (xhr, status, error) {
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateNow();
            updateRefresh(currentSettings.refresh * 1000);
        }
    };

    //加载数据源（这个加载的是Open Weather Map API）
    freeboard.loadDatasourcePlugin({
        type_name: "openweathermap",
        display_name: "Open Weather Map API",
        settings: [
            {
                name: "api_key",
                display_name: "API Key",
                type: "text",
                description: "Your personal API Key from Open Weather Map"
            },
            {
                name: "location",
                display_name: "Location",
                type: "text",
                description: "Example: London, UK"
            },
            {
                name: "units",
                display_name: "Units",
                type: "option",
                default: "imperial",
                options: [
                    {
                        name: "Imperial",
                        value: "imperial"
                    },
                    {
                        name: "Metric",
                        value: "metric"
                    }
                ]
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                suffix: "seconds",
                default_value: 5
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new openWeatherMapDatasource(settings, updateCallback));
        }
    });

    //dweet.io格式的数据源
    var dweetioDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;

        function onNewDweet(dweet) {
            updateCallback(dweet);
        }

        this.updateNow = function () {
            dweetio.get_latest_dweet_for(currentSettings.thing_id, function (err, dweet) {
                if (err) {
                    //onNewDweet({});
                }
                else {
                    onNewDweet(dweet[0].content);
                }
            });
        }

        this.onDispose = function () {

        }

        this.onSettingsChanged = function (newSettings) {
            dweetio.stop_listening_for(currentSettings.thing_id);

            currentSettings = newSettings;

            dweetio.listen_for(currentSettings.thing_id, function (dweet) {
                onNewDweet(dweet.content);
            });
        }

        self.onSettingsChanged(settings);
    };

    //加载数据源（这加载的是Dweet.io）
    freeboard.loadDatasourcePlugin({
        "type_name": "dweet_io",
        "display_name": "Dweet.io",
        "external_scripts": [
            "http://dweet.io/client/dweet.io.min.js"
        ],
        "settings": [
            {
                name: "thing_id",
                display_name: "Thing Name",
                "description": "Example: salty-dog-1",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new dweetioDatasource(settings, updateCallback));
        }
    });

    //Playback格式的数据源
    var playbackDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var currentDataset = [];
        var currentIndex = 0;
        var currentTimeout;

        function moveNext() {
            if (currentDataset.length > 0) {
                if (currentIndex < currentDataset.length) {
                    updateCallback(currentDataset[currentIndex]);
                    currentIndex++;
                }

                if (currentIndex >= currentDataset.length && currentSettings.loop) {
                    currentIndex = 0;
                }

                if (currentIndex < currentDataset.length) {
                    currentTimeout = setTimeout(moveNext, currentSettings.refresh * 1000);
                }
            }
            else {
                updateCallback({});
            }
        }

        function stopTimeout() {
            currentDataset = [];
            currentIndex = 0;

            if (currentTimeout) {
                clearTimeout(currentTimeout);
                currentTimeout = null;
            }
        }

        this.updateNow = function () {
            stopTimeout();

            $.ajax({
                url: currentSettings.datafile,
                dataType: (currentSettings.is_jsonp) ? "JSONP" : "JSON",
                success: function (data) {
                    if (_.isArray(data)) {
                        currentDataset = data;
                    }
                    else {
                        currentDataset = [];
                    }

                    currentIndex = 0;

                    moveNext();
                },
                error: function (xhr, status, error) {
                }
            });
        }

        this.onDispose = function () {
            stopTimeout();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateNow();
        }
    };

    //加载
    freeboard.loadDatasourcePlugin({
        "type_name": "playback",
        "display_name": "Playback",
        "settings": [
            {
                "name": "datafile",
                "display_name": "Data File URL",
                "type": "text",
                "description": "A link to a JSON array of data."
            },
            {
                name: "is_jsonp",
                display_name: "Is JSONP",
                type: "boolean"
            },
            {
                "name": "loop",
                "display_name": "Loop",
                "type": "boolean",
                "description": "Rewind and loop when finished"
            },
            {
                "name": "refresh",
                "display_name": "Refresh Every",
                "type": "number",
                "suffix": "seconds",
                "default_value": 5
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new playbackDatasource(settings, updateCallback));
        }
    });

    //clock格式的数据源
    var clockDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var timer;

        function stopTimer() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }

        function updateTimer() {
            stopTimer();
            timer = setInterval(self.updateNow, currentSettings.refresh * 1000);
        }

        this.updateNow = function () {
            var date = new Date();

            var data = {
                numeric_value: date.getTime(),
                full_string_value: date.toLocaleString(),
                date_string_value: date.toLocaleDateString(),
                time_string_value: date.toLocaleTimeString(),
                date_object: date
            };

            updateCallback(data);
        }

        this.onDispose = function () {
            stopTimer();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            updateTimer();
        }

        updateTimer();
    };
    //加载
    freeboard.loadDatasourcePlugin({
        "type_name": "clock",
        "display_name": "Clock",
        "settings": [
            {
                "name": "refresh",
                "display_name": "Refresh Every",
                "type": "number",
                "suffix": "seconds",
                "default_value": 1
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new clockDatasource(settings, updateCallback));
        }
    });
    //这个是样例没有删应该
    freeboard.loadDatasourcePlugin({
        // **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
        "type_name": "meshblu",
        // **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
        "display_name": "Octoblu",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description": "app.octoblu.com",
        // **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
        "external_scripts": [
            "http://meshblu.octoblu.com/js/meshblu.js"
        ],
        // **settings** : An array of settings that will be displayed for this plugin when the user adds it.
        "settings": [
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "uuid",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "UUID",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "device uuid",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your device UUID",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "token",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Token",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "device token",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your device TOKEN",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "server",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Server",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "meshblu.octoblu.com",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your server",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "port",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Port",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "number",
                // **default_value** : A default value for this setting.
                "default_value": 80,
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "server port",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            }

        ],
        // **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
        // * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
        // * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
        // * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            // myDatasourcePlugin is defined below.
            newInstanceCallback(new meshbluSource(settings, updateCallback));
        }
    });
    // ### Datasource Implementation
    //
    // -------------------
    // Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
    var meshbluSource = function (settings, updateCallback) {
        // Always a good idea...
        var self = this;
        // Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
        var currentSettings = settings;
        /* This is some function where I'll get my data from somewhere */
        function getData() {
            var conn = skynet.createConnection({
                "uuid": currentSettings.uuid,
                "token": currentSettings.token,
                "server": currentSettings.server,
                "port": currentSettings.port
            });
            conn.on('ready', function (data) {
                conn.on('message', function (message) {
                    var newData = message;
                    updateCallback(newData);
                });
            });
        }
        // **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
        self.onSettingsChanged = function (newSettings) {
            // Here we update our current settings with the variable that is passed in.
            currentSettings = newSettings;
        }
        // **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
        self.updateNow = function () {
            // Most likely I'll just call getData() here.
            getData();
        }
        // **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
        self.onDispose = function () {
            //conn.close();
        }
        // Here we call createRefreshTimer with our current settings, to kick things off, initially. Notice how we make use of one of the user defined settings that we setup earlier.
        //	createRefreshTimer(currentSettings.refresh_time);
    }
}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
// ###数据源实施
//
// -------------------
//这里我们实现了实际的数据源插件。我们传入设置和updateCallback。
(function () {
    //json格式的数据源(原始的)
    var jsonDatasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }

            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }

            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }

            var body = currentSettings.body;

            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }

            $.ajax({
                url: requestURL,
                dataType: (errorStage == 1) ? "JSONP" : "JSON",
                type: currentSettings.method || "GET",
                data: body,
                beforeSend: function (xhr) {
                    try {
                        _.each(currentSettings.headers, function (header) {
                            var name = header.name;
                            var value = header.value;

                            if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                xhr.setRequestHeader(name, value);
                            }
                        });
                    }
                    catch (e) {
                    }
                },
                success: function (data) {
                    lockErrorStage = true;

                    updateCallback(data);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new jsonDatasource(settings, updateCallback));
        }
    });


    //json连接实验楼后台的测试
    var json4Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token=sessionStorage.getItem('access_token');

            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/summarys",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },

                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                //console.log();
                success: function (data) {
                    console.log("请求成功");
                    //var data1 = eval('(' + data + ')');
                    //var obj=JSON.parse(data1);
                    lockErrorStage = true;
                    // data=JSON.stringify(data);
                    //console.log(data);

                    updateCallback(data);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "实验楼数据",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json4Datasource(settings, updateCallback));
        }
    });







    //json折线图连接后台的测试
    var json5Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/linechartrequest/test",
                dataType: "JSON",
                type: "GET",
                // data: body,
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },
                success: function (data2) {
                    console.log("第二次请求成功");
                    console.log(data2);
                    var obj = JSON.parse(data2);
                    console.log(obj);

                    updateCallback(obj);
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });

        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "宽带流量占用比折线图",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json5Datasource(settings, updateCallback));
        }
    });










    //json柱状图连接后台的测试
    var json6Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');
                $.ajax({
                    async:false,
                    url: "http://localhost:8181/camel/rest/ksh/linechartrequest/getColumnValue",
                    dataType: "JSON",
                    type: "GET",
                    // data: body,
                    beforeSend: function(request) {
                        request.setRequestHeader('access_token', access_token);
                        //request.setRequestHeader("access_token", access_token);
                        //console.log(data);
                    },
                    success: function (data) {
                        console.log(data)
                        // lockErrorStage = true;
                        var obj = JSON.parse(data);

                        updateCallback(obj);
                    },
                    error: function (xhr, status, error) {
                        console.log("第二次请求失败");
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "线路流量占用比柱状图",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json6Datasource(settings, updateCallback));
        }
    });








    //json  pie+bar连接后台的测试 (右上一)
    var json7Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');

            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/warninginfrecord",
                dataType: "JSON",
                type: "GET" ,
                headers: {'access_token' : access_token },
                // beforeSend: function(request) {
                //     request.setRequestHeader('access_token', access_token);
                // },
                success: function (data) {
                    var obj = JSON.parse(data);
                    // var count = Object.keys(data).length;
                    updateCallback(obj);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "告警信息扇形图",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],

        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json7Datasource(settings, updateCallback));
        }
    });



    //json 面积图连接后台的测试（测试1 第一张图 右中）
    var json8Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }

            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }

            var body = currentSettings.body;

            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token=sessionStorage.getItem('access_token');

            $.ajax({
                url: "http://localhost:8181/camel/rest/ksh/managementobjectrecord",
                dataType: "JSON",
                type:"GET",
                //data: body,


                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                },
                success: function (data) {
                    var obj = JSON.parse(data);
                    var gCount =obj;
                    var MOCount = [];
                    for ( var key in gCount[0]) {
                        if (key == "host") {
                            MOCount.push({
                                "name" : "主机",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#3A6DEA"
                                    }
                                }
                            })

                        } else if (key == "database") {
                            MOCount.push({
                                "name" : "数据库",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#39DEE6"
                                    }
                                }
                            })
                        } else if (key == "network") {
                            MOCount.push({
                                "name" : "网络",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#FF9840"
                                    }
                                }

                            })
                        } else if (key == "service") {
                            MOCount.push({
                                "name" : "标准应用",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#FFC040"
                                    }
                                }
                            })
                        }

                    }
                    updateCallback(MOCount);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "管理对象扇形图",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json8Datasource(settings, updateCallback));
        }
    });





    //骨干路线实时运行情况

    var json9Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/runsits/test",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                },
                success: function (data) {
                    var obj = JSON.parse(data);
                    updateCallback(obj);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "骨干线路实时运行情况",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json9Datasource(settings, updateCallback));
        }
    });







   // 雷达
    var json10Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/realtime/test",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                },
                success: function (data) {
                    var obj = JSON.parse(data);
                    updateCallback(obj);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "雷达图",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json10Datasource(settings, updateCallback));
        }
    });



    // top
    var json11Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/building",
                // dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                },
                success: function (data) {
                    var obj = data.data[0].html;
                    // var obj = JSON.parse(data);
                     updateCallback(obj);//回调函数

                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "拓扑图",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json11Datasource(settings, updateCallback));
        }
    });







    //告警信息列表
    var json12Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');

                $.ajax({
                    async:false,
                    url: "http://localhost:8181/camel/rest/ksh/warninglistrecord/test",
                    dataType: "JSON",
                    type: "GET",
                    // data: body,
                    beforeSend: function(request) {
                        request.setRequestHeader('access_token', access_token);
                        //request.setRequestHeader("access_token", access_token);
                        //console.log(data);
                    },
                    success: function (data2) {
                        // console.log("第二次请求成功");
                        var obj = JSON.parse(data2);

                        updateCallback(obj);
                    },
                    error: function (xhr, status, error) {
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });

        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "告警信息列表",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json12Datasource(settings, updateCallback));
        }
    });


    //总管理对象
    var json13Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token= window.sessionStorage.getItem('access_token');

            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/equipmentrecord",
                dataType: "JSON",
                type: "GET",
                // data: body,
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },
                success: function (data2) {
                     console.log(data2);
                    var obj = JSON.parse(data2);

                    updateCallback(obj);
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });

        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "总管理对象",
        settings: [
            {
                name: "url",
                display_name: "路径",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "尝试代理",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: '首先将尝试直接JSON连接，如果失败，将尝试JSONP连接。如果失败，您可以使用thigPosiver，它可以解决API的许多连接问题。 <a href="https://github.com/Freeboard/thingproxy" target="_blank">更多信息</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "请求方式",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "请求主体",
                type: "text",
                description: "请求的主体，通常只使用 POST"
            },
            {
                name: "headers",
                display_name: "请求首部",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json13Datasource(settings, updateCallback));
        }
    });













    // Open Weather Map Api格式的数据源
    var openWeatherMapDatasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }

            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        function toTitleCase(str) {
            return str.replace(/\w\S*/g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        }

        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            $.ajax({
                url: "http://api.openweathermap.org/data/2.5/weather?APPID=" + currentSettings.api_key + "&q=" + encodeURIComponent(currentSettings.location) + "&units=" + currentSettings.units,
                dataType: "JSONP",
                success: function (data) {
                    // Rejigger our data into something easier to understand
                    var newData = {
                        place_name: data.name,
                        sunrise: (new Date(data.sys.sunrise * 1000)).toLocaleTimeString(),
                        sunset: (new Date(data.sys.sunset * 1000)).toLocaleTimeString(),
                        conditions: toTitleCase(data.weather[0].description),
                        current_temp: data.main.temp,
                        high_temp: data.main.temp_max,
                        low_temp: data.main.temp_min,
                        pressure: data.main.pressure,
                        humidity: data.main.humidity,
                        wind_speed: data.wind.speed,
                        wind_direction: data.wind.deg
                    };

                    updateCallback(newData);
                },
                error: function (xhr, status, error) {
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateNow();
            updateRefresh(currentSettings.refresh * 1000);
        }
    };

    //加载数据源（这个加载的是Open Weather Map API）
    freeboard.loadDatasourcePlugin({
        type_name: "openweathermap",
        display_name: "加载Open Weather Map API数据源",
        settings: [
            {
                name: "api_key",
                display_name: "API密钥",
                type: "text",
                description: "开放天气图的个人API密钥"
            },
            {
                name: "location",
                display_name: "位置",
                type: "text",
                description: "例如：伦敦，英国"
            },
            {
                name: "units",
                display_name: "单位",
                type: "option",
                default: "imperial",
                options: [
                    {
                        name: "Imperial",
                        value: "imperial"
                    },
                    {
                        name: "Metric",
                        value: "metric"
                    }
                ]
            },
            {
                name: "refresh",
                display_name: "刷新时间",
                type: "number",
                suffix: "seconds",
                default_value: 5
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new openWeatherMapDatasource(settings, updateCallback));
        }
    });

    //dweet.io格式的数据源
    var dweetioDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;

        function onNewDweet(dweet) {
            updateCallback(dweet);
        }

        this.updateNow = function () {
            dweetio.get_latest_dweet_for(currentSettings.thing_id, function (err, dweet) {
                if (err) {
                    //onNewDweet({});
                }
                else {
                    onNewDweet(dweet[0].content);
                }
            });
        }

        this.onDispose = function () {

        }

        this.onSettingsChanged = function (newSettings) {
            dweetio.stop_listening_for(currentSettings.thing_id);

            currentSettings = newSettings;

            dweetio.listen_for(currentSettings.thing_id, function (dweet) {
                onNewDweet(dweet.content);
            });
        }

        self.onSettingsChanged(settings);
    };
    //加载数据源（这加载的是Dweet.io）
    freeboard.loadDatasourcePlugin({
        "type_name": "dweet_io",
        "display_name": "加载Dweet.io数据源",
        "external_scripts": [
            "http://dweet.io/client/dweet.io.min.js"
        ],
        "settings": [
            {
                name: "thing_id",
                display_name: "物名",
                "description": "例：狗",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new dweetioDatasource(settings, updateCallback));
        }
    });

    //Playback格式的数据源
    var playbackDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var currentDataset = [];
        var currentIndex = 0;
        var currentTimeout;

        function moveNext() {
            if (currentDataset.length > 0) {
                if (currentIndex < currentDataset.length) {
                    updateCallback(currentDataset[currentIndex]);
                    currentIndex++;
                }

                if (currentIndex >= currentDataset.length && currentSettings.loop) {
                    currentIndex = 0;
                }

                if (currentIndex < currentDataset.length) {
                    currentTimeout = setTimeout(moveNext, currentSettings.refresh * 1000);
                }
            }
            else {
                updateCallback({});
            }
        }

        function stopTimeout() {
            currentDataset = [];
            currentIndex = 0;

            if (currentTimeout) {
                clearTimeout(currentTimeout);
                currentTimeout = null;
            }
        }

        this.updateNow = function () {
            stopTimeout();

            $.ajax({
                url: currentSettings.datafile,
                dataType: (currentSettings.is_jsonp) ? "JSONP" : "JSON",
                success: function (data) {
                    if (_.isArray(data)) {
                        currentDataset = data;
                    }
                    else {
                        currentDataset = [];
                    }

                    currentIndex = 0;

                    moveNext();
                },
                error: function (xhr, status, error) {
                }
            });
        }

        this.onDispose = function () {
            stopTimeout();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateNow();
        }
    };
    //加载
    freeboard.loadDatasourcePlugin({
        "type_name": "playback",
        "display_name": "Playback格式的数据源",
        "settings": [
            {
                "name": "datafile",
                "display_name": "数据文件URL",
                "type": "text",
                "description": "指向JSON数据数组的链接。"
            },
            {
                name: "is_jsonp",
                display_name: "是否JSONP",
                type: "boolean"
            },
            {
                "name": "loop",
                "display_name": "回路",
                "type": "boolean",
                "description": "完成后返回"
            },
            {
                "name": "refresh",
                "display_name": "刷新时间",
                "type": "number",
                "suffix": "seconds",
                "default_value": 5
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new playbackDatasource(settings, updateCallback));
        }
    });

    //clock格式的数据源
    var clockDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var timer;

        function stopTimer() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }

        function updateTimer() {
            stopTimer();
            timer = setInterval(self.updateNow, currentSettings.refresh * 1000);
        }

        this.updateNow = function () {
            var date = new Date();

            var data = {
                numeric_value: date.getTime(),
                full_string_value: date.toLocaleString(),
                date_string_value: date.toLocaleDateString(),
                time_string_value: date.toLocaleTimeString(),
                date_object: date
            };

            updateCallback(data);
        }

        this.onDispose = function () {
            stopTimer();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            updateTimer();
        }

        updateTimer();
    };
    //加载
    freeboard.loadDatasourcePlugin({
        "type_name": "clock",
        "display_name": "clock格式的数据源",
        "settings": [
            {
                "name": "refresh",
                "display_name": "刷新时间",
                "type": "number",
                "suffix": "seconds",
                "default_value": 1
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new clockDatasource(settings, updateCallback));
        }
    });


    //这个是样例没有删应该
    freeboard.loadDatasourcePlugin({
        // **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
        "type_name": "meshblu",
        // **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
        "display_name": "Octoblu",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description": "app.octoblu.com",
        // **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
        "external_scripts": [
            "http://meshblu.octoblu.com/js/meshblu.js"
        ],
        // **settings** : An array of settings that will be displayed for this plugin when the user adds it.
        "settings": [
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "uuid",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "UUID",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "device uuid",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your device UUID",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "token",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Token",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "device token",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your device TOKEN",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "server",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Server",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "meshblu.octoblu.com",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your server",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "port",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Port",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "number",
                // **default_value** : A default value for this setting.
                "default_value": 80,
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "server port",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            }

        ],
        // **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
        // * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
        // * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
        // * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            // myDatasourcePlugin is defined below.
            newInstanceCallback(new meshbluSource(settings, updateCallback));
        }
    });
    // ### Datasource Implementation
    //
    // -------------------
    // Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
    var meshbluSource = function (settings, updateCallback) {
        // Always a good idea...
        var self = this;
        // Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
        var currentSettings = settings;
        /* This is some function where I'll get my data from somewhere */
        function getData() {
            var conn = skynet.createConnection({
                "uuid": currentSettings.uuid,
                "token": currentSettings.token,
                "server": currentSettings.server,
                "port": currentSettings.port
            });
            conn.on('ready', function (data) {
                conn.on('message', function (message) {
                    var newData = message;
                    updateCallback(newData);
                });
            });
        }
        // **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
        self.onSettingsChanged = function (newSettings) {
            // Here we update our current settings with the variable that is passed in.
            currentSettings = newSettings;
        }
        // **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
        self.updateNow = function () {
            // Most likely I'll just call getData() here.
            getData();
        }
        // **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
        self.onDispose = function () {
            //conn.close();
        }
        // Here we call createRefreshTimer with our current settings, to kick things off, initially. Notice how we make use of one of the user defined settings that we setup earlier.
        //	createRefreshTimer(currentSettings.refresh_time);
    }
}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {
    var SPARKLINE_HISTORY_LENGTH = 100;
    var SPARKLINE_COLORS = ["#FF9900", "#FFFFFF", "#B3B4B4", "#6B6B6B", "#28DE28", "#13F7F9", "#E6EE18", "#C41204", "#CA3CB8", "#0B1CFB"];

    function easeTransitionText(newValue, textElement, duration) {
        var currentValue = $(textElement).text();
        if (currentValue == newValue)
            return;
        if ($.isNumeric(newValue) && $.isNumeric(currentValue)) {
            var numParts = newValue.toString().split('.');
            var endingPrecision = 0;
            if (numParts.length > 1) {
                endingPrecision = numParts[1].length;
            }
            numParts = currentValue.toString().split('.');
            var startingPrecision = 0;

            if (numParts.length > 1) {
                startingPrecision = numParts[1].length;
            }

            jQuery({
                transitionValue: Number(currentValue),
                precisionValue: startingPrecision
            }).animate({transitionValue: Number(newValue), precisionValue: endingPrecision}, {
                duration: duration,
                step: function () {
                    $(textElement).text(this.transitionValue.toFixed(this.precisionValue));
                },
                done: function () {
                    $(textElement).text(newValue);
                }
            });
        }
        else {
            $(textElement).text(newValue);
        }
    }

    function addSparklineLegend(element, legend) {
        var legendElt = $("<div class='sparkline-legend'></div>");
        for (var i = 0; i < legend.length; i++) {
            var color = SPARKLINE_COLORS[i % SPARKLINE_COLORS.length];
            var label = legend[i];
            legendElt.append("<div class='sparkline-legend-value'><span style='color:" + color + "'>&#9679;</span>" + label + "</div>");
        }
        element.empty().append(legendElt);
        freeboard.addStyle('.sparkline-legend', "margin:5px;");
        freeboard.addStyle('.sparkline-legend-value',
            'color:white; font:10px arial,san serif; float:left; overflow:hidden; width:50%;');
        freeboard.addStyle('.sparkline-legend-value span',
            'font-weight:bold; padding-right:5px;');
    }

    function addValueToSparkline(element, value, legend) {
        var values = $(element).data().values;
        var valueMin = $(element).data().valueMin;
        var valueMax = $(element).data().valueMax;
        if (!values) {
            values = [];
            valueMin = undefined;
            valueMax = undefined;
        }

        var collateValues = function (val, plotIndex) {
            if (!values[plotIndex]) {
                values[plotIndex] = [];
            }
            if (values[plotIndex].length >= SPARKLINE_HISTORY_LENGTH) {
                values[plotIndex].shift();
            }
            values[plotIndex].push(Number(val));

            if (valueMin === undefined || val < valueMin) {
                valueMin = val;
            }
            if (valueMax === undefined || val > valueMax) {
                valueMax = val;
            }
        }

        if (_.isArray(value)) {
            _.each(value, collateValues);
        } else {
            collateValues(value, 0);
        }
        $(element).data().values = values;
        $(element).data().valueMin = valueMin;
        $(element).data().valueMax = valueMax;

        var tooltipHTML = '<span style="color: {{color}}">&#9679;</span> {{y}}';

        var composite = false;
        _.each(values, function (valueArray, valueIndex) {
            $(element).sparkline(valueArray, {
                type: "line",
                composite: composite,
                height: "100%",
                width: "100%",
                fillColor: false,
                lineColor: SPARKLINE_COLORS[valueIndex % SPARKLINE_COLORS.length],
                lineWidth: 2,
                spotRadius: 3,
                spotColor: false,
                minSpotColor: "#78AB49",
                maxSpotColor: "#78AB49",
                highlightSpotColor: "#9D3926",
                highlightLineColor: "#9D3926",
                chartRangeMin: valueMin,
                chartRangeMax: valueMax,
                tooltipFormat: (legend && legend[valueIndex]) ? tooltipHTML + ' (' + legend[valueIndex] + ')' : tooltipHTML
            });
            composite = true;
        });
    }

    var valueStyle = freeboard.getStyleString("values");

    freeboard.addStyle('.widget-big-text', valueStyle + "font-size:75px;");

    freeboard.addStyle('.tw-display', 'width: 100%; height:100%; display:table; table-layout:fixed;');

    freeboard.addStyle('.tw-tr', 'display:table-row;');

    freeboard.addStyle('.tw-tg', 'display:table-row-group;');

    freeboard.addStyle('.tw-tc', 'display:table-caption;');

    freeboard.addStyle('.tw-td', 'display:table-cell;');

    freeboard.addStyle('.tw-value',
        valueStyle +
        'overflow: hidden;' +
        'display: inline-block;' +
        'text-overflow: ellipsis;');

    freeboard.addStyle('.tw-unit',
        'display: inline-block;' +
        'padding-left: 10px;' +
        'padding-bottom: 1.1em;' +
        'vertical-align: bottom;');

    freeboard.addStyle('.tw-value-wrapper',
        'position: relative;' +
        'vertical-align: middle;' +
        'height:100%;');

    freeboard.addStyle('.tw-sparkline', 'height:20px;');


    //已改成 图片固定 可传入文字（想项目信息）
    var pictureWidget = function (settings) {
        var self = this;
        var widgetElement;
        var timer;
        var imageURL;
        var passage;
        var valueElement = $('<div class="text-value" ></div>');

        function stopTimer() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        function updateImage() {
            if (widgetElement && passage) {
                //var cacheBreakerURL = imageURL + (imageURL.indexOf("?") == -1 ? "?" : "&") + Date.now();
                // $(widgetElement).appendChild("<p>项目名称： 网络基础设施状况监测系统 项目占地面积： 100平方米 地址： 吉林省财经大学</p>");
                $(widgetElement).css({
                    "background-image": "url(./img/lou.gif  )"
                });
            }
        }

        //设置容器的宽高
        this.render = function (element) {
            //$(element).empty();
            $(element).css({
                width: "366px",
                height: "222px",
                "margin-top": "20px",
                "background-size": "100% 100%"
            });

            widgetElement = element;
            $(widgetElement).append(valueElement)

        }

        this.onSettingsChanged = function (newSettings) {
            stopTimer();
            if (newSettings.refresh && newSettings.refresh > 0) {
                timer = setInterval(updateImage, Number(newSettings.refresh) * 1000);
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            console.log(newValue);
            var data = "";
            for (var key in newValue[0]) {
                if (key == "proname") {
                    data = data + "项目名称:" + newValue[0][key]
                } else if (key == "areacovered") {
                    data = data + ",项目占地面积:" + newValue[0][key]
                } else if (key == "addr") {
                    data = data + ",地址:" + newValue[0][key]
                }
            }
            console.log(data);
            //项目名称:网络基础设施状况监测系统,项目占地面积:100平方米,地址:吉林省财经大学
            var arr = data.split(",");
            if (arr != null) {
                valueElement.text("");
                for (var i = 0; i < arr.length; i++) {
                    //项目名称:网络基础设施状况监测系统
                    //项目占地面积:100平方米
                    //地址:吉林省财经大学
                    var one = arr[i].split(":");
                    for (var j = 0; j < one.length; j++) {
                        //console.log(one[i]);
                        if (j == 0) {
                            passage = one[j] + ":"
                            //console.log(passage);
                        }
                        else {
                            if (one[j].length > 7) {
                                var str1 = one[j].substring(0, 8);
                                var str2 = one[j].substring(8, one[j].length);
                                passage = str1 + "<br>" + str2
                            } else {
                                passage = one[j];
                            }
                            console.log(passage);
                        }
                        ;

                        var txt = document.createElement("p");
                        txt.innerHTML = passage;
                        //  整体字体大小
                        // $(txt).css({
                        //     "width": "100%",
                        //     "font-size": "12px",
                        //     "color": "#00f6ff"
                        // });
                        valueElement.append(txt);
                    }

                }

            }
            updateImage();
        }

        this.onDispose = function () {
            stopTimer();
        }

        this.getHeight = function () {
            return 3.5;
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        type_name: "picture",
        display_name: "实验楼数据",
        fill_size: true,
        settings: [
            //{
            //   name: "src",
            //   display_name: "Image URL",
            //   type: "calculated"
            // },
            {
                name: "passage",
                display_name: "passage",
                type: "calculated"
            },
            {
                "type": "number",
                "display_name": "Refresh every",
                "name": "refresh",
                "suffix": "seconds",
                "description": "Leave blank if the image doesn't need to be refreshed"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pictureWidget(settings));
        }
    });


    // 自定义组件 LineMore动图(折线图自写)
    var eChartsLineMoreActiveWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget">' +
            '<div class="custom-wrapper" id="' + thisGaugeID + '"style="height:300px"></div>' +
            '</div>');
        var currentSettings = settings;
        var option = {
            baseOption: {
                timeline: {
                    left: 50,
                    // y: 0,
                    axisType: 'category',
                    // realtime: false,
                    // loop: false,
                    autoPlay: true,
                    // currentIndex: 2,
                    playInterval: 1000,
                    // controlStyle: {
                    //     position: 'left'
                    // },
                    data: [
                        '1', '2', '3', '4', '5'
                    ],
                },
                // backgroundColor: '#000000',//背景色
                grid: {
                    width: '70%',
                    height: '40%',
                    left: 'center',
                    bottom: '25%'
                },
                legend: {
                    data: [],
                    textStyle: {
                        //文字颜色
                        color: '#00f6ff',
                        fontSize: 10,
                    },
                    left: 'center',
                    y: 40
                },
                title: {
                    y: 15,
                    textStyle: {
                        fontSize: 15,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },
                    left: 'center',
                },
                tooltip: {
                    trigger: 'axis'
                },
                // color:'#ff1323',
                xAxis: {
                    //设置坐标轴名称的文本类型
                    nameTextStyle: {
                        color: '#00f6ff'
                    },
                    //坐标轴的名称 距离轴线的距离
                    //nameGap:2,
                    //设置类目轴
                    type: 'category',
                    splitLine: {//设置网格不显示
                        show: false
                    },
                    axisLine: {//设置坐标轴不显示
                        show: false
                    },
                    /**
                     * 定义 X 轴标签字样式
                     */
                    axisLabel: {
                        //可以设置成 0 强制显示所有标签。 如果设置为 1，表示『隔一个标签显示一个标签』，如果值为 2，表示隔两个标签显示一个标签，以此类推。
                        interval: 0,
                        //字体倾斜
                        //rotate:-40,
                        //设置字体竖起来显示
                        //formatter:function(value)
                        //{
                        //   return value.split("").join("\n");
                        //},
                        color: '#00f6ff',
                        fontSize: 12,
                        fontFamily: 'Microsoft YaHei'
                    },
                },
                yAxis: {
                    min:0,
                    // max:50,
                    //坐标轴的名称 距离轴线的距离
                    nameGap: 10,
                    //设置y轴坐标名称旋转
                    nameRotate: 40,
                    offset: 3,
                    nameTextStyle: {
                        color: '#00f6ff'
                    },
                    splitLine: {//设置网格不显示
                        show: true,
                        lineStyle: {
                            // 使用深浅的间隔色
                            color: ['#00f6ff', '#ddd'],
                            //type:'dotted'
                        }
                    },
                    axisLine: {//设置坐标轴不显示
                        show: false
                    },
                    /**
                     * 定义 y 轴标签字样式
                     */
                    axisLabel: {
                        color: '#00f6ff',
                        fontSize: 12,
                        fontFamily: 'Microsoft YaHei'
                    },
                    nameLocation: 'start',
                    type: 'value',// Y轴的定义
                },
                series: [
                    {
                        type: 'line',
                        itemStyle: {
                            normal: {
                                color: '#00f6ff'
                            }
                        },
                        barCateGoryGap: 20,
                        barWidth: 10,
                    },
                ]
            },
            options: [
                {
                    title: {},
                    series: []
                },
            ]
        };
        var dom = null;
        var myChart = null;
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                dom = document.getElementById(thisGaugeID);
                myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };
        this.onCalculatedValueChanged = function (settingName, newValue) {
            var result = newValue;
            var yAxisName = result["yAxis"].name;
            // var yAxisMax = result["yAxis"].max;
            var xAxisName = result["xAxisName"];
            var pList = result["pList"];
            var xAxisData = result["xAxisData"];
            var titleData = result["titleData"];
            var lValue = result["lValue"];
            var dataMap = {};

            for(let i=1;i<=result.lValue.length;i++){
                var DL = "dataList"+i;
                var dataList = result[DL]
                dataMap[i-1] = dataFormatter(dataList);
            }
            for(var j=0; j < titleData.length; j++){
                option.options[j] = {series: [], title: {}};
                for(var z=0;z<=result.lValue.length-1;z++){
                    option.options[j].series.push({
                        name: lValue[z],
                        data: dataMap[z][j],
                        type: "line"
                    });
                }
                option.options[j].title.text = titleData[j];
            }



            function dataFormatter(obj) {
                var temp;
                for (var year = 0; year <= 4; year++) {
                    temp = obj[year];
                    for (var i = 0; i < temp.length; i++) {
                        obj[year][i] = {
                            name: pList[i],
                            value: temp[i]
                        }
                    }
                }
                //console.log(obj);
                return obj;
            }

            option.baseOption.legend.data = lValue,
                option.baseOption.xAxis.data = xAxisData;
            option.baseOption.yAxis.name = yAxisName;
            // option.baseOption.yAxis.max = yAxisMax;
            option.baseOption.xAxis.name = xAxisName;
            //console.log(option);
            myChart.setOption(option, true);
        };

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        };

        this.getHeight = function () {
            return Number(4.5)
        };

        this.onSettingsChanged(settings);

    }
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_LineMoreActive",
        "display_name": "线路流量占用比折线图",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsLineMoreActiveWidget(settings));
        }
    });





    // 自定义组件 Bar动图(柱图自写)
    var eChartsBarActiveWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget">' +
            '<div class="custom-wrapper" id="' + thisGaugeID + '"style="height:250px"></div>' +
            '</div>');
        var currentSettings = settings;
        var option = {
            baseOption: {
                timeline: {
                    left: 50,
                    // y: 0,
                    axisType: 'category',
                    // realtime: false,
                    // loop: false,
                    autoPlay: true,
                    // currentIndex: 2,
                    playInterval: 1000,
                    // controlStyle: {
                    //     position: 'center'
                    // },
                    data: [
                        '2小时前', '1.5小时前', '1小时前', '0.5小时前', '当前'
                    ],
                },
                // backgroundColor: '#000000',//背景色
                grid: {
                    width: '70%',
                    left: 'center',
                    bottom: '30%'
                },
                title: {
                    y: 15,
                    textStyle: {
                        fontSize: 15,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },
                    left: 'center',
                },
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    //设置坐标轴名称的文本类型
                    nameTextStyle: {
                        color: '#00f6ff'
                    },
                    //坐标轴的名称 距离轴线的距离
                    //nameGap:2,
                    //设置类目轴
                    type: 'category',
                    splitLine: {//设置网格不显示
                        show: false
                    },
                    axisLine: {//设置坐标轴不显示
                        show: false
                    },
                    /**
                     * 定义 X 轴标签字样式
                     */
                    axisLabel: {
                        //可以设置成 0 强制显示所有标签。 如果设置为 1，表示『隔一个标签显示一个标签』，如果值为 2，表示隔两个标签显示一个标签，以此类推。
                        interval: 0,
                        //字体倾斜
                        //rotate:-40,
                        //设置字体竖起来显示
                        //formatter:function(value)
                        //{
                        //   return value.split("").join("\n");
                        //},
                        color: '#00f6ff',
                        fontSize: 12,
                        fontFamily: 'Microsoft YaHei'
                    },
                },
                yAxis: {
                    //坐标轴的名称 距离轴线的距离
                    nameGap: 10,
                    //设置y轴坐标名称旋转
                    nameRotate: 40,
                    offset: 3,
                    nameTextStyle: {
                        color: '#00f6ff'
                    },
                    splitLine: {//设置网格不显示
                        show: true,
                        lineStyle: {
                            // 使用深浅的间隔色
                            color: ['#00f6ff', '#ddd'],
                            //type:'dotted'
                        }
                    },
                    axisLine: {//设置坐标轴不显示
                        show: false
                    },
                    /**
                     * 定义 y 轴标签字样式
                     */
                    axisLabel: {
                        color: '#00f6ff',
                        fontSize: 12,
                        fontFamily: 'Microsoft YaHei'
                    },
                    nameLocation: 'start',
                    type: 'value',
                },
                series: [
                    {
                        type: 'bar',
                        itemStyle: {
                            normal: {
                                color: '#FF9840'
                            }
                        },
                        barCateGoryGap: 20,
                        barWidth: 10,
                    },
                ]
            },
            options: [
                {
                    title: {},
                    series: []
                },
                {
                    title: {},
                    series: []
                },
                {
                    title: {},
                    series: []
                },
                {
                    title: {},
                    series: []
                },
            ]
        };
        var dom = null;
        var myChart = null;
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                dom = document.getElementById(thisGaugeID);
                myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };
        this.onCalculatedValueChanged = function (settingName, newValue) {
            var result = newValue;

            var pList = result['pList'];
            var dataList  = result['dataList'];
            var xAxisData = result['xAxisData'];
            var yAxisName= result['yAxis'].name;
            // var yAxisMax = result['yAxis'].max;
            var xAxisName =  result['xAxisName'];
            var titleData =  result['titleData'];

            // for (var key in result) {
            //     if (key == "yAxis") {
            //         yAxisName = result[key].name;
            //         yAxisMax = result[key].max;
            //     } else if (key == "xAxisName") {
            //         xAxisName = result[key];
            //     } else if (key == "pList") {
            //         pList = result[key];
            //
            //     } else if (key == "dataList") {
            //         dataList = result[key];
            //     } else if (key == "xAxisData") {
            //         xAxisData = result[key];
            //     } else if (key == "titleData") {
            //         titleData = result[key];
            //     }
            // }
            //console.log(dataList);
            var dataMap = {};

            function dataFormatter(obj) {
                var temp;
                for (var year = 0; year <= 4; year++) {
                    temp = obj[year];
                    for (var i = 0; i < temp.length; i++) {
                        //console.log(temp[i]);
                        obj[year][i] = {
                            name: pList[i],
                            value: temp[i]
                        }
                    }
                }
                //console.log(obj);
                return obj;
            }

            dataMap = dataFormatter(dataList);
            console.log(dataMap);
            for (var i = 0; i < titleData.length; i++) {
                option.options[i] = {series: [], title: {}};
                option.options[i].series.push({
                    data: dataMap[i],
                });
                option.options[i].title.text = titleData[i];
            }
            option.baseOption.xAxis.data = xAxisData;
            option.baseOption.yAxis.name = yAxisName;
            option.baseOption.yAxis.max = yAxisMax;
            option.baseOption.xAxis.name = xAxisName;
            //console.log(option);
            myChart.setOption(option, true);
        };

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        };

        this.getHeight = function () {
            return Number(3.5)
        };

        this.onSettingsChanged(settings);

    }
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_BarActive",
        "display_name": "线路流量占用比柱状图",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsBarActiveWidget(settings));
        }
    });


    // 自定义组件 annulus（圆环图自己写的  智能统计图   右下）
    var eChartsAnnulusWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget bling2">' +
            '<div class="custom-wrapper" id="' + thisGaugeID + '" style="height:250px;"></div>' +
            //'<div style="position:absolute;left:260px;top:220px">' + '<p>总管理对象209</p></div>' +
            '</div>');
        var currentSettings = settings;
        var option = {
            // backgroundColor: '#000000',//背景色

            title:
                [
                    {

                        textStyle: {
                            fontSize: 15,
                            //文字颜色
                            color: '#00f6ff',
                            fontFamily: 'Microsoft YaHei'
                        },
                        y: 10,
                        x: 0,
                        text: '智能统计图',
                        left: 'center'
                    },
                    {
                        textStyle: {
                            fontSize: 12,
                            //文字颜色
                            color: '#00f6ff',
                            fontFamily: 'Microsoft YaHei'
                        },
                        text: '总管理对象',
                        x: 'center',
                        y: '50%',
                    },
                ],
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            option.series.push({
                data: value,
                type: 'pie',
                radius: ['50%', '40%'],
                center: ['50%', '55%'],
            })
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(3.5)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_annulus",
        "display_name": "智能统计图",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsAnnulusWidget(settings));
        }
    });


//  自定义组件AnnulusRing2（嵌套环形图+bar图自己写的 目前用的   右上）
    var eChartsAnnulusRing2Widget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var thisGaugeID1 = "circle";
        var htmlElement = $('<div class="custom-widget bling2" >' +
            // '<div class="custom-wrapper" id="' + thisGaugeID + '" style="height:500px ;top:20px;"></div>' +
            // '<div  id="' + thisGaugeID1 + '" style="position:absolute;left:10px;top:45%;width:500px;height:300px"></div>' +
            '<div class="custom-wrapper" id="' + thisGaugeID + '" style="height:300px; top:10px;"></div>' +
            '<div  id="' + thisGaugeID1 + '" style="  position:absolute; width:85%; top:75%; left:0; height: 30%"></div>' +
            // '<div style="position:absolute;left:42%;top:25%"><p>被管理对象类型</p></div>' +
            '</div>');
        var currentSettings = settings;
        var option = {
            //backgroundColor: '#000000',//背景色
            title: [
                {
                    //标题
                    y: 10,
                    textStyle: {
                        fontSize: 15,
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },

                    left: 'center',
                },
                {
                    //处理率
                    textStyle: {
                        fontSize: 14,
                        lineHeight:30,
                        color: '#FFC040',
                        fontFamily: 'Microsoft YaHei'
                    },

                    x: 'center',
                    y: '35%',
                },
            ],
            series: []
        };
        var option1 = {
            grid: {
                top: 5,
                width: '100%',
                height: '90px',
                right: '-20px',
                bottom: 2,
                containLabel: true
            },
            xAxis: {
                splitLine: {//设置网格不显示
                    show: false
                },
                axisLine: {//设置坐标轴不显示
                    show: false
                },
                show: false,//设置坐标不显示
                //max: 100,
                type: 'value',
                boundaryGap: [0, 0.01]
            },
            yAxis: {
                splitLine: {//设置网格不显示
                    show: false
                },
                axisLine: {//设置坐标轴不显示
                    show: false
                },
                // 下面三条数据
                axisLabel: {
                    color: '#00f6ff',
                    fontSize: 12,
                    fontFamily: 'Microsoft YaHei'
                },
                type: 'category',
            },
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);

                var dom1 = document.getElementById(thisGaugeID1);
                var myChart1 = echarts.init(dom1);
                myChart1.setOption(option1, true);
            }, 1000);
        };
        this.onCalculatedValueChanged = function (settingName, newValue) {

            var value = newValue;
            console.log('1597563951357951357951357',value)
            if (value && value.length > 0) {
                value = eval(value);

                var sCircle = value[0].smallCircle;
                console.log('9999999999999999999999999999999999999',sCircle)
                var bCircle = value[1].bigCircle;
                console.log('9999999999999999999999999999999999999',bCircle)
                option1.yAxis.data = value[2].barName;
                var bValue = value[3].barValue;
                console.log('00000000000000000000000++++++++',bValue);
                option.title[0].text = value[4].title1;
                option.title[1].text = value[4].title2;
                option.series = [];
                option1.series = [];
                //内圈数据
                option.series.push({
                    itemStyle: {
                        normal: {
                            color: '#FF9840'
                        }
                    },
                    type: 'pie',
                    radius: ['25%', '43%'],
                    // label: {
                    //     normal: {
                    //         formatter: ' {b|{b}}\n{hr|}\n{c}',
                    //         //backgroundColor: '#333',
                    //         rich: {
                    //             // 未处理下横线
                    //             hr: {
                    //                 borderColor: '#00f6ff',
                    //                 width: '100%',
                    //                 borderWidth: 0.5,
                    //                 height: 0
                    //             },
                    //             b: {
                    //                 //未处理字体颜色
                    //                 color: '#FFAB00',
                    //                 lineHeight: 22,
                    //                 align: 'center'
                    //             },
                    //             c: {
                    //                 color: '#FFAB00',
                    //                 lineHeight: 22,
                    //                 align: 'center'
                    //             },
                    //         }
                    //     }
                    // },
                    labelLine: {
                        length2: 0.1,
                    },
                    center: ['50%', '40%'],
                    data: sCircle
                });
                option.series.push({
                    type: 'pie',
                    radius: ['43%', '35%'],
                    // label: {
                    //     normal: {
                    //         formatter: ' {b|{b}}\n{hr|}\n  {c}    ',
                    //         //backgroundColor: '#333',
                    //         rich: {
                    //             hr: {
                    //                 //已处理数字体
                    //                 borderColor: '#00f6ff',
                    //                 width: '100%',
                    //                 borderWidth: 0.5,
                    //                 height: 0
                    //             },
                    //             b: {
                    //                 //已处理数下横线
                    //                 color: '#00f6ff',
                    //                 lineHeight: 22,
                    //                 align: 'center'
                    //             },
                    //             c: {
                    //                 color: '#00f6ff',
                    //                 lineHeight: 22,
                    //                 align: 'center'
                    //             },
                    //         }
                    //     }
                    // },
                    labelLine: {
                        length2: 20000,
                    },
                    center: ['50%', '40%'],
                    data: bCircle
                });
                option1.series.push({
                    stack: 'chart',
                    xAxisIndex: 0,
                    yAxisIndex: 0,
                    z: 3,
                    itemStyle: {
                        normal: {
                            // 下面三条数据图形颜色
                            color: '#00f6ff',
                        }
                    },
                    label: {
                        normal: {
                            position: ['50%', '-1px'],
                            color:'#000',
                            fontWeight:600,
                            show: true
                        },
                    },
                    barWidth: 10,
                    type: 'bar',
                    data: bValue
                });
                var b = [];

                // var max = parseInt(bValue[0]) + parseInt(bValue[1]);
                var max = parseInt(bValue[0]) + parseInt(bValue[1]);
                option1.xAxis.max = max;
                for (var i = 0; i < bValue.length; i++) {
                    b.push(max - bValue[i]);
                }
                ;
                console.log(b);
                option1.series.push({
                    type: 'bar',
                    stack: 'chart',
                    xAxisIndex: 0,
                    yAxisIndex: 0,
                    silent: true,
                    itemStyle: {
                        normal: {
                            color: 'rgb(27,65,78)',
                        }
                    },
                    data: b
                },);
                console.log(option1);
            }
        }
        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(4.5)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_annulusRing2",
        "display_name": "告警信息扇形图",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsAnnulusRing2Widget(settings));
        }
    });


    // 自定义组件 Radar4（4单个雷达图 目前使用的图）
    var eChartsRadar4Widget = function (settings) {
        var thisGaugeID0 = "gauge-" + gaugeID++;
        var thisGaugeID1 = "radar2";
        var thisGaugeID2 = "radar3";
        var thisGaugeID3 = "radar4";
        var htmlElement = $('<div class="custom-widget" style="height: 700px">' +
            '<div class="custom-wrapper" id="' + thisGaugeID0 + '" style="height: 25%"></div>' +
            '<div  id="' + thisGaugeID1 + '"  style="position:absolute;top:25%;width:100%;height: 25%"></div>' +
            '<div  id="' + thisGaugeID2 + '"  style="position:absolute;top:50%;width:100%;height: 25%"></div>' +
            '<div  id="' + thisGaugeID3 + '"  style="position:absolute;top:75%;width:100%;height: 25%"></div>' +
            '</div>');
        var currentSettings = settings;
        var opArr = [];
        var option = {
            title: [
                {
                    y: 'bottom',
                    textStyle: {
                        fontSize: 15,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },

                    x: '40%',
                },
                {
                    textStyle: {
                        fontSize: 12,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },

                    x: '50%',
                    y: '20%',
                },
                {
                    textStyle: {
                        fontSize: 12,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },

                    x: '50%',
                    y: '40%',
                },
                {
                    textStyle: {
                        fontSize: 12,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },

                    x: '50%',
                    y: '60%',
                }
            ],
            //backgroundColor: '#000000',//背景色
            radar: [
                {
                    splitNumber: '4',
                    indicator: [
                        {max: 100},
                        {max: 100},
                        {max: 100}
                    ],
                    center: ['30%', '50%'],
                    radius: 50,
                    shape: 'circle',
                    splitArea: {
                        areaStyle: {
                            color: ['rgba(114, 172, 209, 1)',
                                'rgba(114, 172, 209, 0.8)', 'rgba(114, 172, 209, 0.6)',
                                'rgba(114, 172, 209, 0.4)', 'rgba(114, 172, 209, 0.2)'],
                            shadowColor: 'rgba(0, 0, 0, 0.3)',
                            shadowBlur: 10
                        }
                    }
                },
            ],
            series: []
        };
        var option1,option2,option3,option4
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID0);
                var myChart = echarts.init(dom);
                console.log(dom);
                myChart.setOption(option1, true);

                var dom2 = document.getElementById(thisGaugeID1);
                console.log(dom2);
                var myChart1 = echarts.init(dom2);
                myChart1.setOption(option2, true);

                var dom3 = document.getElementById(thisGaugeID2);
                console.log(dom3);
                var myChart1 = echarts.init(dom3);
                myChart1.setOption(option3, true);

                var dom4 = document.getElementById(thisGaugeID3);
                console.log(dom4);
                var myChart1 = echarts.init(dom4);
                myChart1.setOption(option4, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value;
            var op;
            for (var i = 0; i < newValue.length; i++) {
                value = newValue[i];
                console.log("每一个对象", value);
                op = option
                op.series = [];
                op.title[0].text = value["title"]["name"];
                op.title[1].text = value["title"]["CPULoad"];
                op.title[2].text = value["title"]["OUsedRatio"];
                op.title[3].text = value["title"]["Uptime"];
                op.series.push(
                            {
                                type: 'radar',
                                itemStyle: {
                                    normal: {
                                        lineStyle: {
                                            color: 'rgba(60,60,200,0.7)' // 图表中各个图区域的边框线颜色
                                        },
                                        areaStyle: {
                                            color: 'rgba(255,171,0,0.4)'
                                        }
                                    }
                                },
                                data: value["value"]
                            },
                        );
                console.log(op)
                opArr.push(op)
                }
                option1 = opArr[0]
                option2 = opArr[0]
                option3 = opArr[0]
                option4 = opArr[0]

        };

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(12)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_radar4",
        "display_name": "雷达图",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsRadar4Widget(settings));
        }
    });




    //自定义组件 NightingaleRoseDiagram（面积图   右中）
    var eChartsNightingaleRoseDiagramWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget bling3">' +
            '<div class="custom-wrapper" id="' + thisGaugeID + '" style="height:250px;"></div>' +
            '</div>');
        var currentSettings = settings;
        var option = {
            title: [
                {
                    // backgroundColor: "#1b414e",
                    y: 10,
                    textStyle: {
                        fontSize: 15,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },
                    left: 'center',
                },
                {
                    x: '35%',
                    y: '50%',
                    textStyle: {
                        fontSize: 12,
                        //文字颜色
                        color: '#00f6ff',
                        fontFamily: 'Microsoft YaHei'
                    },
                    //left: 'center'
                }],
            // backgroundColor: '#000000',//背景色
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            console.log('3333333333333333333333333333333333333333333',value)
            option.title[0].text = '被管理对象';
            option.title[1].text = '管理对象类型';
            option.series.push({
                name: '面积模式',
                type: 'pie',
                label: {
                    normal: {
                        formatter: '{b}：{c} ',
                    }
                },
                labelLine: {
                    length2: 0.01,
                },
                radius: [40, 65],
                center: ['48%', '55%'],
                roseType: 'area',
                data: value,
            })
            // option.series.data[1].push({
            //     selected:'true'
            // })
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(3.5)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_NightingaleRoseDiagram",
        "display_name": "管理对象扇形图",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsNightingaleRoseDiagramWidget(settings));
        }
    });





    //第一张图的表格（带滚动效果）
    var LoopTableWidget = function (settings) {
        console.log('[Test] LoopTableWidget', settings);
        var len = 16;
        var thisGaugeID = "gauge-" + gaugeID++;
        var captionId = thisGaugeID + '-caption';
        var tableThId = thisGaugeID + '-tableTh';
        var tableArea = thisGaugeID + '-tableArea';
        var tableTrId = thisGaugeID + '-tableTr';
        var htmlElement = $(
            '<div class="custom-widget" style="color: #00f6ff">' +
            '<div class="custom-wrapper custom-table" id="' + thisGaugeID + '" style="height:250px;">' +
            '<div class="caption" id="' + captionId + '" style="font-size: 15px;font-weight: 600" ></div>' +
            '<table class="table-th" cellpadding="0" cellspacing="0" id="' + tableThId + '" style="font-weight: 600;" ></table>' +
            '<div class="table-area">' +
            '<table class="table-tr" cellpadding="0" cellspacing="0" id="' + tableTrId + '" style="text-align: center" ><tbody></tbody></table>' +
            '</div>' +
            '</div>' +
            '</div>');
        var currentSettings = settings;
        var height = 4;
        var colgroup = null
        var $caption = null;
        var $tableTh = null;
        var $tableArea = null;
        var $tableTr = null;

        var flagLoad = 0;
        this.render = function (element) {
            $(element).append(htmlElement);
            $caption = $('#' + captionId);
            $tableTh = $('#' + tableThId);
            $tableTr = $('#' + tableTrId);
            $tableArea = $('#' + tableArea);
        };

        function goRun() {
            if (flagLoad === 1) {

                //一个格子 30px
                var step = 30;
                //数据总的长度   在外面定义了
                //var len = 16;
                //走完一个格子的时间
                var ti = 100;
                var maxTop = $tableTr.height() / 2;
                runTr();

                function runTr() {
                    $tableTr.animate({'margin-top': -(maxTop) + 'px'}, (step * len * ti), 'linear', function () {
                        $tableTr.stop().css({'margin-top': '0px'});
                        runTr();
                    });
                }
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;

            if ($caption) {
                $caption.html(value.title);
            }
            if ($tableTh) {
                var tds = [];
                var cols = [];
                $.each(value.thead, function (i, e) {
                    tds.push('<td>' + e.name + '</td>');
                    cols.push('<col style="width:' + e.width + '"/>');
                });
                colgroup = '<colgroup>' + cols.join('') + '</colgroup>';
                if ($tableTh) {
                    $tableTh.html(colgroup + '<tr>' + tds.join('') + '</tr>');
                }
                var _trs = [];
                $.each(value.data, function (i, e) {
                    var _tds = []
                    for (var k in e) {
                        if(k==='name'){
                            _tds[0]= '<td>' + e[k] + '</td>';
                        } else if(k==='version'){
                            _tds[1]= '<td>' + e[k] + '</td>';
                        } else if(k==='level'){
                            _tds[2]= '<td>' + e[k] + '</td>';
                        } else {
                            if (e[k].length > 40) {
                                var str1 = e[k].substring(0, 29);
                                var str2 = e[k].substring(66, 69);

                                _tds[3]= '<td >' + str1 + str2 + "..." + '</td>';
                            }
                        }
                    }
                    _trs.push('<tr>' + _tds.join('') + '</tr>');
                });
                if ($tableTr) {
                    $tableTr.html(colgroup + _trs.join('') + _trs.join(''));
                }
            }
            flagLoad += 1;
            goRun();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            height = currentSettings.Height;
        }

        this.getHeight = function () {
            return Number(3.5)
        }

        this.onSettingsChanged(settings);
        this.onDispose = function () {
            $tableTr.stop();
            // clearInterval(mt);
        }
    };
    freeboard.loadWidgetPlugin({
        "type_name": "loop-table",
        "display_name": "告警信息列表",
        "fill_size": true,
        "settings": [
            {
                name: "Title",
                display_name: "标题",
                "type": "text"
            },
            {
                "name": "tableData",
                "display_name": "表格数据",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            },
            {
                name: "Height",
                display_name: "高度",
                type: "text",
                default_value: 5
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new LoopTableWidget(settings));
        }
    });


    //第二张图的表格（带滚动效果）
    var LoopTableWidget2 = function (settings) {
        console.log('[Test] LoopTableWidget', settings);
        var len = 8;
        var thisGaugeID = "gauge-" + gaugeID++;
        var captionId = thisGaugeID + '-caption';
        var tableThId = thisGaugeID + '-tableTh';
        var tableArea = thisGaugeID + '-tableArea';
        var tableTrId = thisGaugeID + '-tableTr';
        var htmlElement = $(
            '<div class="custom-widget" style="color: #00f6ff">' +
            '<div class="custom-wrapper custom-table" id="' + thisGaugeID + '" style="height:700px;">' +
            '<div class="caption" id="' + captionId + '"></div>' +
            '<table class="table-th" cellpadding="0" cellspacing="0" id="' + tableThId + '"></table>' +
            '<div class="table-area" style="height: 700px">' +
            '<table class="table-tr" cellpadding="0" cellspacing="0" id="' + tableTrId + '" style="height: 600px"><tbody></tbody></table>' +
            '</div>' +
            '</div>' +
            '</div>');
        var currentSettings = settings;
        var height = 4;
        var colgroup = null
        var $caption = null;
        var $tableTh = null;
        var $tableArea = null;
        var $tableTr = null;

        var flagLoad = 1;
        this.render = function (element) {
            console.log('[Test] render');
            $(element).append(htmlElement);
            $caption = $('#' + captionId);
            $tableTh = $('#' + tableThId);
            $tableTr = $('#' + tableTrId);
            $tableArea = $('#' + tableArea);
        };

        function goRun() {
            if (flagLoad === 2) {
                console.log('[Test] GoRun');
                //一个格子 30px
                var step = 30;
                //数据总的长度   在外面定义了
                //var len = 16;
                //走完一个格子的时间
                var ti = 80;
                var maxTop = $tableTr.height() / 2;

                console.log("run中的len:" + len);
                runTr();

                function runTr() {
                    $tableTr.animate({'margin-top': -(maxTop) + 'px'}, (step * len * ti), 'linear', function () {
                        $tableTr.stop().css({'margin-top': '0px'});
                        runTr();
                    });
                }
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            console.log('[Test] onCalculatedValueChanged:', settingName);
            var value = newValue;
            if ($caption) {
                $caption.html(value.title);
            }
            if ($tableTh) {
                var tds = [];
                var cols = [];
                $.each(value.thead, function (i, e) {
                    tds.push('<td>' + e.name + '</td>');
                    cols.push('<col style="width:' + e.width + '"/>');
                });
                colgroup = '<colgroup>' + cols.join('') + '</colgroup>';
                if ($tableTh) {
                    $tableTh.html(colgroup + '<tr>' + tds.join('') + '</tr>');
                }
                var _trs = [];
                $.each(value.data, function (i, e) {
                    var _tds = []
                    for (var k in e) {
                        _tds.push('<td>' + e[k] + '</td>');
                    }
                    _trs.push('<tr height="60px">' + _tds.join('') + '</tr>');
                });
                //我在这个地方 把len设置为_trs的长度不直达对不对
                len = _trs.length;
                console.log(len);

                if ($tableTr) {
                    $tableTr.html(colgroup + _trs.join('') + _trs.join(''));
                }
            }
            flagLoad += 1;
            goRun();
            // switch (settingName) {
            //   case 'Title':
            //     // console.log('Title', value)
            //     if ($caption) {
            //       flag_Title += 1
            //       $caption.html(value);
            //     }
            //     break
            //   case 'thead':
            //     var tds = [];
            //     var cols = [];
            //     $.each(value, function (i, e) {
            //       tds.push('<td>' + e.name + '</td>');
            //       cols.push('<col style="width:' + e.width + '"/>');
            //     });
            //     colgroup = '<colgroup>' + cols.join('') + '</colgroup>';
            //     if ($tableTh) {
            //       flag_thead += 1
            //       $tableTh.html(colgroup + '<tr>' + tds.join('') + '</tr>');
            //     }
            //     break
            //   case 'tableData':
            //     var _trs = []
            //     $.each(value, function (i, e) {
            //       var _tds = []
            //       for (var k in e) {
            //         _tds.push('<td>' + e[k] + '</td>');
            //       }
            //       _trs.push('<tr>' + _tds.join('') + '</tr>');
            //     });
            //     if ($tableTr) {
            //       flag_tableData += 1
            //       $tableTr.html(colgroup + _trs.join('') + _trs.join(''));
            //     }
            //     break
            // }
            // goRun();
        }

        this.onSettingsChanged = function (newSettings) {
            console.log('[Test] onSettingsChanged');
            currentSettings = newSettings;
            height = currentSettings.Height;
        }

        this.getHeight = function () {
            return Number(12)
        }


        this.onDispose = function () {
            console.log('[Test] onDispose');
            $tableTr.stop();
            // clearInterval(mt);
        }
        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "loop-table2",
        "display_name": "骨干路线实时运行情况",
        "fill_size": true,
        "settings": [
            {
                name: "Title",
                display_name: "标题",
                "type": "text"
            },
            {
                "name": "tableData",
                "display_name": "表格数据",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            },
            {
                name: "Height",
                display_name: "高度",
                type: "text",
                default_value: 5
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new LoopTableWidget2(settings));
        }
    });

    // lou
    var FloorWidget = function (settings) {
        var self = this;
        var htmlElement = $('<div class="html-widget" id="htmlWidget">' +
            '<div class="btnbox"><button id="add" class="add">添加楼宇</button><button id="save" class="save">保存更改</button></div>'+
            '<div id="bling" class="bling">'+
            '<div class="bl-left">实验楼</div>'+
            '<div class="bl-right"><p>楼宇名称：实验楼</p><p>当前设备量：107</p><p>警告数：0</p></div>'+
            '</div>'+
            '<div id="diagramContainer">'+
            '<div id="item_a" class="item1 my-item"><img src="./img/tongxin.png"><div contenteditable="true">通信中心</div></div>'+
            '<div id="item_f" class="item3 my-item" style="top: 150px;left: 215px;"><img src="./img/tongxin.png"><div contenteditable = "true">网络中心</div></div>'+
            '<div id="item_b" class="abcd my-item" style="left: 85px;top: 590px"><img src="./img/tongxin.png"><div>电信1</div></div>'+
            '<div id="item_c" class="abcd my-item" style="left: 140px;top: 590px"><img src="./img/tongxin.png"><div>电信2</div></div>'+
            '<div id="item_d" class="abcd my-item" style="left: 315px;top: 590px"><img src="./img/tongxin.png"><div>联通1</div></div>'+
            '<div id="item_e" class="abcd my-item" style="left: 370px;top: 590px"><img src="./img/tongxin.png"><div>联通2</div></div>'+
            '</div>'+
            '<div id="div1"></div>'+
            '</div>');


        var currentSettings = settings;
        console.log('currentSettings', currentSettings)
        this.render = function (element) {
            console.log('render')
            htmlElement.css({height: (currentSettings.Height * 64) + 'px'});
            $(element).append(htmlElement);
            $('#diagramContainer').html(currentSettings.HTML)
            floorReady();
            $('#htmlWidget').on("click", "div[contenteditable='true']",function(){
                $(this).focus();
            });
        }

        this.onSettingsChanged = function (newSettings) {
            console.log('onSettingsChanged')
            currentSettings = newSettings;
            console.log('currentSettings00000000000000000000000000', currentSettings)
            setTimeout(function () {
                // $('#diagramContainer').html(currentSettings.HTML)
                // floorReady();
                // $('#htmlWidget').on("click", "div[contenteditable='true']",function(){
                //     $(this).focus();
                // });
            },500);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue
            console.log('value111111111111111111111111111111111111', value)
            console.log(value.data[0].html)
            if (settingName == "html") {
                // console.log(newValue);
                htmlElement.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return Number(currentSettings.Height);
            // return Number(3.5);
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "floor-widget",
        "display_name": "拓扑图",
        "fill_size": true,
        "settings": [
            {
                name: "Title",
                display_name: "标题",
                "type": "text"
            },
            {
                "name": "HTML",
                "display_name": "表格数据",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            },
            {
                name: "Height",
                display_name: "高度",
                type: "text",
                default_value: 10
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new FloorWidget(settings));
        }
    });

    // BMS
    var BMSWidget = function (settings) {
        var self = this;
        var htmlElement = $('<div class="html-widget" id="htmlWidget">'+
                        '<div id="theback" style="text-align: center;padding-bottom: 20px">'+
            '<iframe style="margin-top: 24px;border: 0" width="900px" height="540px" seamless src="http://10.0.2.6/cas/login?username=test123&password=beta123&module=业务拓扑业务拓扑_true"></iframe>'+
            // '<img src="content.png" style="width: 900px;height:540px">'+
            '</div>'+
            //             '<div id="theback" style="text-align: center;padding-bottom: 20px"><div class="scroll"><ul>'+
            //             '<li><iframe style="margin-top: 24px;border: 0" width="900px" height="540px" seamless src="http://10.0.2.6/cas/login?username=test123&password=beta123&module=业务拓扑业务拓扑_true"></iframe></li>'+
            //             '<li><div>2</div></li>'+
            //             '<li><div>3</div></li>'+
            //             '<li><div>4</div></li>'+
            //             '<li><div>5</div></li>'+
            //             '</ul>'+
            //             '<a href="#" class="prev"></a><a href="#" class="next"></a>'+
            //             '</div>'+
            //             '</div>'+
            '</div>');


        var currentSettings = settings;
        console.log('currentSettings', currentSettings)
        this.render = function (element) {
            console.log('render')
            $(element).append(htmlElement);
            $('#theback').html(currentSettings.HTML)
            // mmm();

        }

        this.onSettingsChanged = function (newSettings) {
            console.log('onSettingsChanged')
            currentSettings = newSettings;
            console.log('currentSettings00000000000000000000000000', currentSettings)
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return Number(9);
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "bms-widget",
        "display_name": "ＢＭＳ图",
        "fill_size": true,
        "settings": [
            {
                name: "Title",
                display_name: "标题",
                "type": "text"
            },
            {
                "name": "HTML",
                "display_name": "表格数据",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            },
            {
                name: "Height",
                display_name: "高度",
                type: "text",
                default_value: 9
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new BMSWidget(settings));
        }
    });


    var indicatorWidget = function (settings) {
        var self = this;
        var titleElement = $('<h2 class="section-title"></h2>');
        var stateElement = $('<div class="indicator-text"></div>');
        var indicatorElement = $('<div class="indicator-light"></div>');
        var currentSettings = settings;
        var isOn = false;
        var onText;
        var offText;

        function updateState() {
            indicatorElement.toggleClass("on", isOn);

            if (isOn) {
                stateElement.text((_.isUndefined(onText) ? (_.isUndefined(currentSettings.on_text) ? "" : currentSettings.on_text) : onText));
            }
            else {
                stateElement.text((_.isUndefined(offText) ? (_.isUndefined(currentSettings.off_text) ? "" : currentSettings.off_text) : offText));
            }
        }

        this.render = function (element) {
            $(element).append(titleElement).append(indicatorElement).append(stateElement);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
            updateState();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {
                isOn = Boolean(newValue);
            }
            if (settingName == "on_text") {
                onText = newValue;
            }
            if (settingName == "off_text") {
                offText = newValue;
            }

            updateState();
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 1;
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        type_name: "indicator",
        display_name: "指示",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "on_text",
                display_name: "On Text",
                type: "calculated"
            },
            {
                name: "off_text",
                display_name: "Off Text",
                type: "calculated"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new indicatorWidget(settings));
        }
    });
    freeboard.addStyle('.gm-style-cc a', "text-shadow:none;");


    var googleMapWidget = function (settings) {
        var self = this;
        var currentSettings = settings;
        var map;
        var marker;
        var currentPosition = {};

        function updatePosition() {
            if (map && marker && currentPosition.lat && currentPosition.lon) {
                var newLatLon = new google.maps.LatLng(currentPosition.lat, currentPosition.lon);
                marker.setPosition(newLatLon);
                map.panTo(newLatLon);
            }
        }

        this.render = function (element) {
            function initializeMap() {
                var mapOptions = {
                    zoom: 13,
                    center: new google.maps.LatLng(37.235, -115.811111),
                    disableDefaultUI: true,
                    draggable: false,
                    styles: [
                        {
                            "featureType": "water", "elementType": "geometry", "stylers": [
                                {"color": "#2a2a2a"}
                            ]
                        },
                        {
                            "featureType": "landscape", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 20}
                            ]
                        },
                        {
                            "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 17}
                            ]
                        },
                        {
                            "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 29},
                                {"weight": 0.2}
                            ]
                        },
                        {
                            "featureType": "road.arterial", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 18}
                            ]
                        },
                        {
                            "featureType": "road.local", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 16}
                            ]
                        },
                        {
                            "featureType": "poi", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 21}
                            ]
                        },
                        {
                            "elementType": "labels.text.stroke", "stylers": [
                                {"visibility": "on"},
                                {"color": "#000000"},
                                {"lightness": 16}
                            ]
                        },
                        {
                            "elementType": "labels.text.fill", "stylers": [
                                {"saturation": 36},
                                {"color": "#000000"},
                                {"lightness": 40}
                            ]
                        },
                        {
                            "elementType": "labels.icon", "stylers": [
                                {"visibility": "off"}
                            ]
                        },
                        {
                            "featureType": "transit", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 19}
                            ]
                        },
                        {
                            "featureType": "administrative", "elementType": "geometry.fill", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 20}
                            ]
                        },
                        {
                            "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 17},
                                {"weight": 1.2}
                            ]
                        }
                    ]
                };

                map = new google.maps.Map(element, mapOptions);

                google.maps.event.addDomListener(element, 'mouseenter', function (e) {
                    e.cancelBubble = true;
                    if (!map.hover) {
                        map.hover = true;
                        map.setOptions({zoomControl: true});
                    }
                });

                google.maps.event.addDomListener(element, 'mouseleave', function (e) {
                    if (map.hover) {
                        map.setOptions({zoomControl: false});
                        map.hover = false;
                    }
                });

                marker = new google.maps.Marker({map: map});

                updatePosition();
            }

            if (window.google && window.google.maps) {
                initializeMap();
            }
            else {
                window.gmap_initialize = initializeMap;
                head.js("https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=gmap_initialize");
            }
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "lat") {
                currentPosition.lat = newValue;
            }
            else if (settingName == "lon") {
                currentPosition.lon = newValue;
            }

            updatePosition();
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 4;
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        type_name: "google_map",
        display_name: "谷歌地图",
        fill_size: true,
        settings: [
            {
                name: "lat",
                display_name: "Latitude",
                type: "calculated"
            },
            {
                name: "lon",
                display_name: "Longitude",
                type: "calculated"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new googleMapWidget(settings));
        }
    });
    freeboard.addStyle('.html-widget', "white-space:normal;width:100%;height:100%");
    //freeboard.addStyle('.html-widget', "white-space:normal;width:100%;height:100%;background-image:url(./img/chang.png);background-size: 620px 250px;background-position: 0 -100px;");

    // 自定义组件
    //freeboard.addStyle('.custom-widget', "background-color:#ffffff;");
    freeboard.addStyle('.custom-widget');
    freeboard.addStyle('.custom-wrapper', "height:500px;");

    freeboard.addStyle('.indicator-light', "border-radius:50%;width:22px;height:22px;border:2px solid #3d3d3d;margin-top:5px;float:left;background-color:#222;margin-right:10px;");
    freeboard.addStyle('.indicator-light.on', "background-color:#FFC773;box-shadow: 0px 0px 15px #FF9900;border-color:#FDF1DF;");
    freeboard.addStyle('.indicator-text', "margin-top:10px;");

    //显示一段文本
    var textWidget = function (settings) {

        var self = this;

        var currentSettings = settings;
        var displayElement =


            function updateValueSizing() {
                if (!_.isUndefined(currentSettings.units) && currentSettings.units != "") // If we're displaying our units
                {
                    valueElement.css("max-width", (displayElement.innerWidth() - unitsElement.outerWidth(true)) + "px");
                }
                else {
                    valueElement.css("max-width", "100%");
                }
            }

        this.render = function (element) {
            $(element).empty();
            $(displayElement)
                .append($('<div class="tw-tr"></div>').append(titleElement))
                .append($('<div class="tw-tr"></div>').append($('<div class="tw-value-wrapper tw-td"></div>').append(valueElement).append(unitsElement)))
                .append($('<div class="tw-tr"></div>').append(sparklineElement));
            $(element).append(displayElement);
            updateValueSizing();
        };
        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            var shouldDisplayTitle = (!_.isUndefined(newSettings.title) && newSettings.title != "");
            var shouldDisplayUnits = (!_.isUndefined(newSettings.units) && newSettings.units != "");
            if (newSettings.sparkline) {
                sparklineElement.attr("style", null);
            }
            else {
                delete sparklineElement.data().values;
                sparklineElement.empty();
                sparklineElement.hide();
            }
            if (shouldDisplayTitle) {
                titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
                titleElement.attr("style", null);
            }
            else {
                titleElement.empty();
                titleElement.hide();
            }
            if (shouldDisplayUnits) {
                unitsElement.html((_.isUndefined(newSettings.units) ? "" : newSettings.units));
                unitsElement.attr("style", null);
            }
            else {
                unitsElement.empty();
                unitsElement.hide();
            }
            var valueFontSize = 30;
            if (newSettings.size == "big") {
                valueFontSize = 75;
                if (newSettings.sparkline) {
                    valueFontSize = 60;
                }
            }
            valueElement.css({"font-size": valueFontSize + "px"});
            updateValueSizing();
        }
        this.onSizeChanged = function () {
            updateValueSizing();
        }
        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {
                if (currentSettings.animate) {
                    easeTransitionText(newValue, valueElement, 500);
                }
                else {
                    valueElement.text(newValue);
                }
                if (currentSettings.sparkline) {
                    addValueToSparkline(sparklineElement, newValue);
                }
            }
        };

        this.onDispose = function () {
        };
        this.getHeight = function () {
            if (currentSettings.size == "big" || currentSettings.sparkline) {
                return 2;
            }
            else {
                return 1;
            }
        };
        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        type_name: "text_widget",
        display_name: "文本",
        "external_scripts": [
            "plugins/thirdparty/jquery.sparkline.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "size",
                display_name: "Size",
                type: "option",
                options: [
                    {
                        name: "Regular",
                        value: "regular"
                    },
                    {
                        name: "Big",
                        value: "big"
                    }
                ]
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "sparkline",
                display_name: "Include Sparkline",
                type: "boolean"
            },
            {
                name: "animate",
                display_name: "Animate Value Changes",
                type: "boolean",
                default_value: true
            },
            {

                name: "units",
                display_name: "Units",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new textWidget(settings));
        }
    });

    var gaugeID = 0;
    freeboard.addStyle('.gauge-widget-wrapper', "width: 100%;text-align: center;");
    freeboard.addStyle('.gauge-widget', "width:200px;height:160px;display:inline-block;");

    var gaugeWidget = function (settings) {
        console.log(' === Gauge === : ', settings);
        var self = this;

        var thisGaugeID = "gauge-" + gaugeID++;
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div class="gauge-widget" id="' + thisGaugeID + '"></div>');

        var gaugeObject;
        var rendered = false;

        var currentSettings = settings;

        function createGauge() {
            if (!rendered) {
                return;
            }

            gaugeElement.empty();

            gaugeObject = new JustGage({
                id: thisGaugeID,
                value: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                min: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                max: (_.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value),
                label: currentSettings.units,
                showInnerShadow: false,
                valueFontColor: "#d3d4d4"
            });
        }

        this.render = function (element) {
            rendered = true;
            $(element).append(titleElement).append($('<div class="gauge-widget-wrapper"></div>').append(gaugeElement));
            createGauge();
        }

        this.onSettingsChanged = function (newSettings) {
            if (newSettings.min_value != currentSettings.min_value || newSettings.max_value != currentSettings.max_value || newSettings.units != currentSettings.units) {
                currentSettings = newSettings;
                createGauge();
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (!_.isUndefined(gaugeObject)) {
                gaugeObject.refresh(Number(newValue));
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 3;
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        type_name: "gauge",
        display_name: "量规",
        "external_scripts": [
            "plugins/thirdparty/raphael.2.1.0.min.js",
            "plugins/thirdparty/justgage.1.0.1.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "text",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "text",
                default_value: 100
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new gaugeWidget(settings));
        }
    });
    freeboard.addStyle('.sparkline', "width:100%;height: 75px;");

    var sparklineWidget = function (settings) {
        var self = this;

        var titleElement = $('<h2 class="section-title"></h2>');
        var sparklineElement = $('<div class="sparkline"></div>');
        var sparklineLegend = $('<div></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(titleElement).append(sparklineElement).append(sparklineLegend);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));

            if (newSettings.include_legend) {
                addSparklineLegend(sparklineLegend, newSettings.legend.split(","));
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (currentSettings.legend) {
                addValueToSparkline(sparklineElement, newValue, currentSettings.legend.split(","));
            } else {
                addValueToSparkline(sparklineElement, newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            var legendHeight = 0;
            if (currentSettings.include_legend && currentSettings.legend) {
                var legendLength = currentSettings.legend.split(",").length;
                if (legendLength > 4) {
                    legendHeight = Math.floor((legendLength - 1) / 4) * 0.5;
                } else if (legendLength) {
                    legendHeight = 0.5;
                }
            }
            return 2 + legendHeight;
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        type_name: "sparkline",
        display_name: "迷你图",
        "external_scripts": [
            "plugins/thirdparty/jquery.sparkline.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated",
                multi_input: "true"
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            },
            {
                name: "legend",
                display_name: "Legend",
                type: "text",
                description: "Comma-separated for multiple sparklines"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new sparklineWidget(settings));
        }
    });
    freeboard.addStyle('div.pointer-value', "position:absolute;height:95px;margin: auto;top: 0px;bottom: 0px;width: 100%;text-align:center;");

    var pointerWidget = function (settings) {
        var self = this;
        var paper;
        var strokeWidth = 3;
        var triangle;
        var width, height;
        var currentValue = 0;
        var valueDiv = $('<div class="widget-big-text"></div>');
        var unitsDiv = $('<div></div>');

        function polygonPath(points) {
            if (!points || points.length < 2)
                return [];
            var path = []; //will use path object type
            path.push(['m', points[0], points[1]]);
            for (var i = 2; i < points.length; i += 2) {
                path.push(['l', points[i], points[i + 1]]);
            }
            path.push(['z']);
            return path;
        }

        this.render = function (element) {
            width = $(element).width();
            height = $(element).height();

            var radius = Math.min(width, height) / 2 - strokeWidth * 2;

            paper = Raphael($(element).get()[0], width, height);
            var circle = paper.circle(width / 2, height / 2, radius);
            circle.attr("stroke", "#FF9900");
            circle.attr("stroke-width", strokeWidth);

            triangle = paper.path(polygonPath([width / 2, (height / 2) - radius + strokeWidth, 15, 20, -30, 0]));
            triangle.attr("stroke-width", 0);
            triangle.attr("fill", "#fff");

            $(element).append($('<div class="pointer-value"></div>').append(valueDiv).append(unitsDiv));
        }

        this.onSettingsChanged = function (newSettings) {
            unitsDiv.html(newSettings.units);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "direction") {
                if (!_.isUndefined(triangle)) {
                    var direction = "r";

                    var oppositeCurrent = currentValue + 180;

                    if (oppositeCurrent < newValue) {
                        //direction = "l";
                    }

                    triangle.animate({transform: "r" + newValue + "," + (width / 2) + "," + (height / 2)}, 250, "bounce");
                }

                currentValue = newValue;
            }
            else if (settingName == "value_text") {
                valueDiv.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 4;
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        type_name: "pointer",
        display_name: "指针",
        "external_scripts": [
            "plugins/thirdparty/raphael.2.1.0.min.js"
        ],
        settings: [
            {
                name: "direction",
                display_name: "Direction",
                type: "calculated",
                description: "In degrees"
            },
            {
                name: "value_text",
                display_name: "Value Text",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pointerWidget(settings));
        }
    });

    freeboard.addStyle('.text-value',
        'padding-top:10px;' +
        'padding-left:10px;' +
        'height:200px;' +
        'width:150px;' +
        'overflow: hidden;' +
        'display: inline-block;' +
        'text-overflow: ellipsis;');


}());


// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {
    var SPARKLINE_HISTORY_LENGTH = 100;
    var SPARKLINE_COLORS = ["#FF9900", "#FFFFFF", "#B3B4B4", "#6B6B6B", "#28DE28", "#13F7F9", "#E6EE18", "#C41204", "#CA3CB8", "#0B1CFB"];

    function easeTransitionText(newValue, textElement, duration) {

        var currentValue = $(textElement).text();

        if (currentValue == newValue)
            return;

        if ($.isNumeric(newValue) && $.isNumeric(currentValue)) {
            var numParts = newValue.toString().split('.');
            var endingPrecision = 0;

            if (numParts.length > 1) {
                endingPrecision = numParts[1].length;
            }

            numParts = currentValue.toString().split('.');
            var startingPrecision = 0;

            if (numParts.length > 1) {
                startingPrecision = numParts[1].length;
            }

            jQuery({
                transitionValue: Number(currentValue),
                precisionValue: startingPrecision
            }).animate({transitionValue: Number(newValue), precisionValue: endingPrecision}, {
                duration: duration,
                step: function () {
                    $(textElement).text(this.transitionValue.toFixed(this.precisionValue));
                },
                done: function () {
                    $(textElement).text(newValue);
                }
            });
        }
        else {
            $(textElement).text(newValue);
        }
    }

    function addSparklineLegend(element, legend) {
        var legendElt = $("<div class='sparkline-legend'></div>");
        for (var i = 0; i < legend.length; i++) {
            var color = SPARKLINE_COLORS[i % SPARKLINE_COLORS.length];
            var label = legend[i];
            legendElt.append("<div class='sparkline-legend-value'><span style='color:" +
                color + "'>&#9679;</span>" + label + "</div>");
        }
        element.empty().append(legendElt);

        freeboard.addStyle('.sparkline-legend', "margin:5px;");
        freeboard.addStyle('.sparkline-legend-value',
            'color:white; font:10px arial,san serif; float:left; overflow:hidden; width:50%;');
        freeboard.addStyle('.sparkline-legend-value span',
            'font-weight:bold; padding-right:5px;');
    }

    function addValueToSparkline(element, value, legend) {
        var values = $(element).data().values;
        var valueMin = $(element).data().valueMin;
        var valueMax = $(element).data().valueMax;
        if (!values) {
            values = [];
            valueMin = undefined;
            valueMax = undefined;
        }

        var collateValues = function (val, plotIndex) {
            if (!values[plotIndex]) {
                values[plotIndex] = [];
            }
            if (values[plotIndex].length >= SPARKLINE_HISTORY_LENGTH) {
                values[plotIndex].shift();
            }
            values[plotIndex].push(Number(val));

            if (valueMin === undefined || val < valueMin) {
                valueMin = val;
            }
            if (valueMax === undefined || val > valueMax) {
                valueMax = val;
            }
        }

        if (_.isArray(value)) {
            _.each(value, collateValues);
        } else {
            collateValues(value, 0);
        }
        $(element).data().values = values;
        $(element).data().valueMin = valueMin;
        $(element).data().valueMax = valueMax;

        var tooltipHTML = '<span style="color: {{color}}">&#9679;</span> {{y}}';

        var composite = false;
        _.each(values, function (valueArray, valueIndex) {
            $(element).sparkline(valueArray, {
                type: "line",
                composite: composite,
                height: "100%",
                width: "100%",
                fillColor: false,
                lineColor: SPARKLINE_COLORS[valueIndex % SPARKLINE_COLORS.length],
                lineWidth: 2,
                spotRadius: 3,
                spotColor: false,
                minSpotColor: "#78AB49",
                maxSpotColor: "#78AB49",
                highlightSpotColor: "#9D3926",
                highlightLineColor: "#9D3926",
                chartRangeMin: valueMin,
                chartRangeMax: valueMax,
                tooltipFormat: (legend && legend[valueIndex]) ? tooltipHTML + ' (' + legend[valueIndex] + ')' : tooltipHTML
            });
            composite = true;
        });
    }

    var valueStyle = freeboard.getStyleString("values");

    freeboard.addStyle('.widget-big-text', valueStyle + "font-size:75px;");

    freeboard.addStyle('.tw-display', 'width: 100%; height:100%; display:table; table-layout:fixed;');

    freeboard.addStyle('.tw-tr',
        'display:table-row;');

    freeboard.addStyle('.tw-tg',
        'display:table-row-group;');

    freeboard.addStyle('.tw-tc',
        'display:table-caption;');

    freeboard.addStyle('.tw-td',
        'display:table-cell;');

    freeboard.addStyle('.tw-value',
        valueStyle +
        'overflow: hidden;' +
        'display: inline-block;' +
        'text-overflow: ellipsis;');

    freeboard.addStyle('.tw-unit',
        'display: inline-block;' +
        'padding-left: 10px;' +
        'padding-bottom: 1.1em;' +
        'vertical-align: bottom;');

    freeboard.addStyle('.tw-value-wrapper',
        'position: relative;' +
        'vertical-align: middle;' +
        'height:100%;');

    freeboard.addStyle('.tw-sparkline',
        'height:20px;');

    var textWidget = function (settings) {

        var self = this;

        var currentSettings = settings;
        var displayElement = $('<div class="tw-display"></div>');
        var titleElement = $('<h2 class="section-title tw-title tw-td"></h2>');
        var valueElement = $('<div class="tw-value"></div>');
        var unitsElement = $('<div class="tw-unit"></div>');
        var sparklineElement = $('<div class="tw-sparkline tw-td"></div>');

        function updateValueSizing() {
            if (!_.isUndefined(currentSettings.units) && currentSettings.units != "") // If we're displaying our units
            {
                valueElement.css("max-width", (displayElement.innerWidth() - unitsElement.outerWidth(true)) + "px");
            }
            else {
                valueElement.css("max-width", "100%");
            }
        }

        this.render = function (element) {
            $(element).empty();

            $(displayElement)
                .append($('<div class="tw-tr"></div>').append(titleElement))
                .append($('<div class="tw-tr"></div>').append($('<div class="tw-value-wrapper tw-td"></div>').append(valueElement).append(unitsElement)))
                .append($('<div class="tw-tr"></div>').append(sparklineElement));

            $(element).append(displayElement);

            updateValueSizing();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;

            var shouldDisplayTitle = (!_.isUndefined(newSettings.title) && newSettings.title != "");
            var shouldDisplayUnits = (!_.isUndefined(newSettings.units) && newSettings.units != "");

            if (newSettings.sparkline) {
                sparklineElement.attr("style", null);
            }
            else {
                delete sparklineElement.data().values;
                sparklineElement.empty();
                sparklineElement.hide();
            }

            if (shouldDisplayTitle) {
                titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
                titleElement.attr("style", null);
            }
            else {
                titleElement.empty();
                titleElement.hide();
            }

            if (shouldDisplayUnits) {
                unitsElement.html((_.isUndefined(newSettings.units) ? "" : newSettings.units));
                unitsElement.attr("style", null);
            }
            else {
                unitsElement.empty();
                unitsElement.hide();
            }

            var valueFontSize = 30;

            if (newSettings.size == "big") {
                valueFontSize = 75;

                if (newSettings.sparkline) {
                    valueFontSize = 60;
                }
            }

            valueElement.css({"font-size": valueFontSize + "px"});

            updateValueSizing();
        }

        this.onSizeChanged = function () {
            updateValueSizing();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {

                if (currentSettings.animate) {
                    easeTransitionText(newValue, valueElement, 500);
                }
                else {
                    valueElement.text(newValue);
                }

                if (currentSettings.sparkline) {
                    addValueToSparkline(sparklineElement, newValue);
                }
            }
        }

        this.onDispose = function () {

        }

        this.getHeight = function () {
            if (currentSettings.size == "big" || currentSettings.sparkline) {
                return 2;
            }
            else {
                return 1;
            }
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "text_widget",
        display_name: "Text",
        "external_scripts": [
            "plugins/thirdparty/jquery.sparkline.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "size",
                display_name: "Size",
                type: "option",
                options: [
                    {
                        name: "Regular",
                        value: "regular"
                    },
                    {
                        name: "Big",
                        value: "big"
                    }
                ]
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "sparkline",
                display_name: "Include Sparkline",
                type: "boolean"
            },
            {
                name: "animate",
                display_name: "Animate Value Changes",
                type: "boolean",
                default_value: true
            },
            {

                name: "units",
                display_name: "Units",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new textWidget(settings));
        }
    });

    var gaugeID = 0;
    freeboard.addStyle('.gauge-widget-wrapper', "width: 100%;text-align: center;");
    freeboard.addStyle('.gauge-widget', "width:200px;height:160px;display:inline-block;");

    var gaugeWidget = function (settings) {
        console.log(' === Gauge === : ', settings);
        var self = this;

        var thisGaugeID = "gauge-" + gaugeID++;
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div class="gauge-widget" id="' + thisGaugeID + '"></div>');

        var gaugeObject;
        var rendered = false;

        var currentSettings = settings;

        function createGauge() {
            if (!rendered) {
                return;
            }

            gaugeElement.empty();

            gaugeObject = new JustGage({
                id: thisGaugeID,
                value: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                min: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                max: (_.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value),
                label: currentSettings.units,
                showInnerShadow: false,
                valueFontColor: "#d3d4d4"
            });
        }

        this.render = function (element) {
            rendered = true;
            $(element).append(titleElement).append($('<div class="gauge-widget-wrapper"></div>').append(gaugeElement));
            createGauge();
        }

        this.onSettingsChanged = function (newSettings) {
            if (newSettings.min_value != currentSettings.min_value || newSettings.max_value != currentSettings.max_value || newSettings.units != currentSettings.units) {
                currentSettings = newSettings;
                createGauge();
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (!_.isUndefined(gaugeObject)) {
                gaugeObject.refresh(Number(newValue));
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 3;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "gauge",
        display_name: "Gauge",
        "external_scripts": [
            "plugins/thirdparty/raphael.2.1.0.min.js",
            "plugins/thirdparty/justgage.1.0.1.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "text",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "text",
                default_value: 100
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new gaugeWidget(settings));
        }
    });

    freeboard.addStyle('.sparkline', "width:100%;height: 75px;");
    var sparklineWidget = function (settings) {
        var self = this;

        var titleElement = $('<h2 class="section-title"></h2>');
        var sparklineElement = $('<div class="sparkline"></div>');
        var sparklineLegend = $('<div></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(titleElement).append(sparklineElement).append(sparklineLegend);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));

            if (newSettings.include_legend) {
                addSparklineLegend(sparklineLegend, newSettings.legend.split(","));
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (currentSettings.legend) {
                addValueToSparkline(sparklineElement, newValue, currentSettings.legend.split(","));
            } else {
                addValueToSparkline(sparklineElement, newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            var legendHeight = 0;
            if (currentSettings.include_legend && currentSettings.legend) {
                var legendLength = currentSettings.legend.split(",").length;
                if (legendLength > 4) {
                    legendHeight = Math.floor((legendLength - 1) / 4) * 0.5;
                } else if (legendLength) {
                    legendHeight = 0.5;
                }
            }
            return 2 + legendHeight;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "sparkline",
        display_name: "Sparkline",
        "external_scripts": [
            "plugins/thirdparty/jquery.sparkline.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated",
                multi_input: "true"
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            },
            {
                name: "legend",
                display_name: "Legend",
                type: "text",
                description: "Comma-separated for multiple sparklines"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new sparklineWidget(settings));
        }
    });

    freeboard.addStyle('div.pointer-value', "position:absolute;height:95px;margin: auto;top: 0px;bottom: 0px;width: 100%;text-align:center;");
    var pointerWidget = function (settings) {
        var self = this;
        var paper;
        var strokeWidth = 3;
        var triangle;
        var width, height;
        var currentValue = 0;
        var valueDiv = $('<div class="widget-big-text"></div>');
        var unitsDiv = $('<div></div>');

        function polygonPath(points) {
            if (!points || points.length < 2)
                return [];
            var path = []; //will use path object type
            path.push(['m', points[0], points[1]]);
            for (var i = 2; i < points.length; i += 2) {
                path.push(['l', points[i], points[i + 1]]);
            }
            path.push(['z']);
            return path;
        }

        this.render = function (element) {
            width = $(element).width();
            height = $(element).height();

            var radius = Math.min(width, height) / 2 - strokeWidth * 2;

            paper = Raphael($(element).get()[0], width, height);
            var circle = paper.circle(width / 2, height / 2, radius);
            circle.attr("stroke", "#FF9900");
            circle.attr("stroke-width", strokeWidth);

            triangle = paper.path(polygonPath([width / 2, (height / 2) - radius + strokeWidth, 15, 20, -30, 0]));
            triangle.attr("stroke-width", 0);
            triangle.attr("fill", "#fff");

            $(element).append($('<div class="pointer-value"></div>').append(valueDiv).append(unitsDiv));
        }

        this.onSettingsChanged = function (newSettings) {
            unitsDiv.html(newSettings.units);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "direction") {
                if (!_.isUndefined(triangle)) {
                    var direction = "r";

                    var oppositeCurrent = currentValue + 180;

                    if (oppositeCurrent < newValue) {
                        //direction = "l";
                    }

                    triangle.animate({transform: "r" + newValue + "," + (width / 2) + "," + (height / 2)}, 250, "bounce");
                }

                currentValue = newValue;
            }
            else if (settingName == "value_text") {
                valueDiv.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 4;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "pointer",
        display_name: "Pointer",
        "external_scripts": [
            "plugins/thirdparty/raphael.2.1.0.min.js"
        ],
        settings: [
            {
                name: "direction",
                display_name: "Direction",
                type: "calculated",
                description: "In degrees"
            },
            {
                name: "value_text",
                display_name: "Value Text",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pointerWidget(settings));
        }
    });

    var pictureWidget = function (settings) {
        var self = this;
        var widgetElement;
        var timer;
        var imageURL;

        function stopTimer() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        function updateImage() {
            if (widgetElement && imageURL) {
                var cacheBreakerURL = imageURL + (imageURL.indexOf("?") == -1 ? "?" : "&") + Date.now();

                $(widgetElement).css({
                    "background-image": "url(" + cacheBreakerURL + ")"
                });
            }
        }

        this.render = function (element) {
            $(element).css({
                width: "100%",
                height: "100%",
                "background-size": "cover",
                "background-position": "center"
            });

            widgetElement = element;
        }

        this.onSettingsChanged = function (newSettings) {
            stopTimer();

            if (newSettings.refresh && newSettings.refresh > 0) {
                timer = setInterval(updateImage, Number(newSettings.refresh) * 1000);
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "src") {
                imageURL = newValue;
            }

            updateImage();
        }

        this.onDispose = function () {
            stopTimer();
        }

        this.getHeight = function () {
            return 4;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "picture",
        display_name: "Picture",
        fill_size: true,
        settings: [
            {
                name: "src",
                display_name: "Image URL",
                type: "calculated"
            },
            {
                "type": "number",
                "display_name": "Refresh every",
                "name": "refresh",
                "suffix": "seconds",
                "description": "Leave blank if the image doesn't need to be refreshed"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pictureWidget(settings));
        }
    });

    freeboard.addStyle('.indicator-light', "border-radius:50%;width:22px;height:22px;border:2px solid #3d3d3d;margin-top:5px;float:left;background-color:#222;margin-right:10px;");
    freeboard.addStyle('.indicator-light.on', "background-color:#FFC773;box-shadow: 0px 0px 15px #FF9900;border-color:#FDF1DF;");
    freeboard.addStyle('.indicator-text', "margin-top:10px;");
    var indicatorWidget = function (settings) {
        var self = this;
        var titleElement = $('<h2 class="section-title"></h2>');
        var stateElement = $('<div class="indicator-text"></div>');
        var indicatorElement = $('<div class="indicator-light"></div>');
        var currentSettings = settings;
        var isOn = false;
        var onText;
        var offText;

        function updateState() {
            indicatorElement.toggleClass("on", isOn);

            if (isOn) {
                stateElement.text((_.isUndefined(onText) ? (_.isUndefined(currentSettings.on_text) ? "" : currentSettings.on_text) : onText));
            }
            else {
                stateElement.text((_.isUndefined(offText) ? (_.isUndefined(currentSettings.off_text) ? "" : currentSettings.off_text) : offText));
            }
        }

        this.render = function (element) {
            $(element).append(titleElement).append(indicatorElement).append(stateElement);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
            updateState();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {
                isOn = Boolean(newValue);
            }
            if (settingName == "on_text") {
                onText = newValue;
            }
            if (settingName == "off_text") {
                offText = newValue;
            }

            updateState();
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 1;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "indicator",
        display_name: "Indicator Light",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "on_text",
                display_name: "On Text",
                type: "calculated"
            },
            {
                name: "off_text",
                display_name: "Off Text",
                type: "calculated"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new indicatorWidget(settings));
        }
    });

    freeboard.addStyle('.gm-style-cc a', "text-shadow:none;");

    var googleMapWidget = function (settings) {
        var self = this;
        var currentSettings = settings;
        var map;
        var marker;
        var currentPosition = {};

        function updatePosition() {
            if (map && marker && currentPosition.lat && currentPosition.lon) {
                var newLatLon = new google.maps.LatLng(currentPosition.lat, currentPosition.lon);
                marker.setPosition(newLatLon);
                map.panTo(newLatLon);
            }
        }

        this.render = function (element) {
            function initializeMap() {
                var mapOptions = {
                    zoom: 13,
                    center: new google.maps.LatLng(37.235, -115.811111),
                    disableDefaultUI: true,
                    draggable: false,
                    styles: [
                        {
                            "featureType": "water", "elementType": "geometry", "stylers": [
                                {"color": "#2a2a2a"}
                            ]
                        },
                        {
                            "featureType": "landscape", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 20}
                            ]
                        },
                        {
                            "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 17}
                            ]
                        },
                        {
                            "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 29},
                                {"weight": 0.2}
                            ]
                        },
                        {
                            "featureType": "road.arterial", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 18}
                            ]
                        },
                        {
                            "featureType": "road.local", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 16}
                            ]
                        },
                        {
                            "featureType": "poi", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 21}
                            ]
                        },
                        {
                            "elementType": "labels.text.stroke", "stylers": [
                                {"visibility": "on"},
                                {"color": "#000000"},
                                {"lightness": 16}
                            ]
                        },
                        {
                            "elementType": "labels.text.fill", "stylers": [
                                {"saturation": 36},
                                {"color": "#000000"},
                                {"lightness": 40}
                            ]
                        },
                        {
                            "elementType": "labels.icon", "stylers": [
                                {"visibility": "off"}
                            ]
                        },
                        {
                            "featureType": "transit", "elementType": "geometry", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 19}
                            ]
                        },
                        {
                            "featureType": "administrative", "elementType": "geometry.fill", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 20}
                            ]
                        },
                        {
                            "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [
                                {"color": "#000000"},
                                {"lightness": 17},
                                {"weight": 1.2}
                            ]
                        }
                    ]
                };

                map = new google.maps.Map(element, mapOptions);

                google.maps.event.addDomListener(element, 'mouseenter', function (e) {
                    e.cancelBubble = true;
                    if (!map.hover) {
                        map.hover = true;
                        map.setOptions({zoomControl: true});
                    }
                });

                google.maps.event.addDomListener(element, 'mouseleave', function (e) {
                    if (map.hover) {
                        map.setOptions({zoomControl: false});
                        map.hover = false;
                    }
                });

                marker = new google.maps.Marker({map: map});

                updatePosition();
            }

            if (window.google && window.google.maps) {
                initializeMap();
            }
            else {
                window.gmap_initialize = initializeMap;
                head.js("https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=gmap_initialize");
            }
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "lat") {
                currentPosition.lat = newValue;
            }
            else if (settingName == "lon") {
                currentPosition.lon = newValue;
            }

            updatePosition();
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 4;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "google_map",
        display_name: "Google Map",
        fill_size: true,
        settings: [
            {
                name: "lat",
                display_name: "Latitude",
                type: "calculated"
            },
            {
                name: "lon",
                display_name: "Longitude",
                type: "calculated"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new googleMapWidget(settings));
        }
    });

    freeboard.addStyle('.html-widget', "white-space:normal;width:100%;height:100%");

    var htmlWidget = function (settings) {
        var self = this;
        var htmlElement = $('<div class="html-widget"></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(htmlElement);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "html") {
                htmlElement.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return Number(currentSettings.height);
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        "type_name": "html",
        "display_name": "HTML",
        "fill_size": true,
        "settings": [
            {
                "name": "html",
                "display_name": "HTML",
                "type": "calculated",
                "description": "Can be literal HTML, or javascript that outputs HTML."
            },
            {
                "name": "height",
                "display_name": "Height Blocks",
                "type": "number",
                "default_value": 4,
                "description": "A height block is around 60 pixels"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new htmlWidget(settings));
        }
    });
    // 自定义组件
    freeboard.addStyle('.custom-widget', "background-color:#ffffff;");
    freeboard.addStyle('.custom-wrapper', "height:500px;");
    // 自定义组件 Line（自带的）
    var eChartsLineWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var currentSettings = settings;
        var option = {
            xAxis: {
                type: 'category',
                boundaryGap: false,
                /**
                * 定义 X 轴标签字样式
                */
                axisLabel: {
                     color: '#00f6ff',
                     fontSize: 12,
                     fontFamily: 'Microsoft YaHei'
                }
            },
            yAxis: {
                type: 'value'
            },
            series: []
        };

        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            if (value && value.length > 0) {
                value = eval(value)
                var xAxisData = [];
                var seriesData = [];
                $.each(value, function (i, item) {//遍历value
                    xAxisData.push(item.name)
                    seriesData.push(item.value)
                });
                option.xAxis.data = xAxisData
                option.series.push({
                    data: seriesData,
                    type: 'line',
                    smooth: true
                })
            }
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_line",
        "display_name": "EChartsLine",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsLineWidget(settings));
        }
    });
    // 自定义组件 LineMore（多线图自己写的）
    var eChartsLineMoreWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var currentSettings = settings;
        var option = {
            title: {
                text: '专线流量、带宽占用比TOP',
                left: 'center',
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                left: 'center',
                y: 40 //距离Y轴的距离
            },
            xAxis: {
                name: '流量 ',
                type: 'category',
                boundaryGap: false
            },
            yAxis: {
                name: '占用比',
                nameLocation: 'start',
                type: 'value'
            },
            series: []
        };

        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            if (value && value.length > 0) {
                value = eval(value);
                option.legend.data = value[0].lValue,
                    option.xAxis.data = value[1].xValue;
                $.each(value, function (i, item) {
                    option.series.push(
                        item.value
                    );
                });
                // option.xAxis.data = xAxisData;
            }
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_lineMore",
        "display_name": "EChartsLineMore",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsLineMoreWidget(settings));
        }
    });
    // 自定义组件 Bar(柱图自带的)
    var eChartsBarWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var currentSettings = settings;
        var option = {
            xAxis: {
                silent: false,
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value'
            },
            series: []
        };
        var dom = null;
        var myChart = null;
        this.render = function (element) {
            $(element).append(htmlElement);
            console.log('myChart htmlElement === ')
            setTimeout(function () {
                dom = document.getElementById(thisGaugeID);
                myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            console.log('value:', value)
            if (value && value.length > 0) {
                value = eval(value);
                var xAxisData = [];
                var seriesData = [];
                $.each(value, function (i, item) {
                    xAxisData.push(item.name)
                    seriesData.push(item.value)
                });
                option.xAxis.data = xAxisData
                option.series[0] = {
                    name: 'bar',
                    type: 'bar',
                    data: seriesData,
                    animationDelay: function (idx) {
                        return idx * 10;
                    }
                };

                myChart.setOption(option, true);
            }
        };

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        };

        this.getHeight = function () {
            return Number(8)
        };

        this.onSettingsChanged(settings);

    }
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_bar",
        "display_name": "EChartsBar",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsBarWidget(settings));
        }
    });
    // 自定义组件 BarTwo（双柱图自己写的）
    var eChartsBarTwoWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var currentSettings = settings;
        var htmlElement =
            $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var option = {
            title: {
                text: '骨干线路流量、带宽占用比TOP',
                left: 'center',
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                orient: 'vertical',
                left: 'right',
            },
            calculable: true,
            xAxis:
                {
                    name: '流量',
                    type: 'category',
                }
            ,
            yAxis: [
                {
                    name: '占用比',
                    nameLocation: 'start',
                    type: 'value'
                }
            ],
            series: []
        };

        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            if (value && value.length > 0) {
                value = eval(value)
                option.legend.data = value[0].lValue;
                option.xAxis.data = value[1].xValue;
                $.each(value, function (i, item) {
                    option.series.push(
                        item.value
                    )
                });
            }
        }
        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }
        this.getHeight = function () {
            return Number(8)
        }
        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_barTwo",
        "display_name": "EChartsBarTwo",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsBarTwoWidget(settings));
        }
    });
    // 自定义组件 Pie(饼图自带的)
    var eChartsPieWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var currentSettings = settings;
        var option = {
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            option.series.push({
                type: 'pie',
                data: value
            })
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_pie",
        "display_name": "EChartsPie",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsPieWidget(settings));
        }
    });
    // 自定义组件 annulus（圆环图自己写的）
    var eChartsAnnulusWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div><div style="position:absolute;left:260px;top:220px"><p>总管理对象209</p></div></div>');
        var currentSettings = settings;
        var option = {
            title: {
                text: '智能统计图',
                left: 'center'
            },
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            option.series.push({
                data: value,
                type: 'pie',
                radius: ['50%', '70%'],
            })
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_annulus",
        "display_name": "EChartsAnnulus",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsAnnulusWidget(settings));
        }
    });
    //  自定义组件AnnulusRing1（嵌套环形图自己写的）
    var eChartsAnnulusRing1Widget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var thisGaugeID1 = "circle";
        var htmlElement = $('<div class="custom-widget">' +
            '<div class="custom-wrapper" id="' + thisGaugeID + '" style="height:500px ;top:20px;"></div>' +
            '<div  id="' + thisGaugeID1 + '" style="position:absolute;left:100px;top:45%;width:500px;height:300px"></div>' +
            '<div style="position:absolute;left:42%;top:25%"><p>被管理对象类型</p></div>' +
            '</div>');
        var currentSettings = settings;
        var option = {
            title: {
                text: '警告信息',
                left: 'center',
            },
            series: []
        };

        var option1 = {
            grid: {
                width: '70%',
                top: '30%',
                left: 20,
                containLabel: true
            },
            xAxis: {
                type: 'value',
                boundaryGap: [0, 0.01]
            },
            yAxis: {
                type: 'category',

            },
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);

                var dom1 = document.getElementById(thisGaugeID1);
                var myChart1 = echarts.init(dom1);
                myChart1.setOption(option1, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            if (value && value.length > 0) {
                value = eval(value);
                var sCircle = value[0].smallCircle;
                var bCircle = value[1].bigCircle;
                option1.yAxis.data = value[2].barName;
                var bValue = value[3].barValue;
                option.series.push({
                    name: '访问来源',
                    type: 'pie',
                    radius: ['25%', '30%'],
                    label: {
                        normal: {
                            formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
                            backgroundColor: '#eee',
                            borderColor: '#aaa',
                            borderWidth: 1,
                            borderRadius: 5,
                            rich: {
                                a: {
                                    color: '#999',
                                    lineHeight: 22,
                                    align: 'center'
                                },
                                hr: {
                                    borderColor: '#aaa',
                                    width: '100%',
                                    borderWidth: 0.5,
                                    height: 0
                                },
                                b: {
                                    fontSize: 16,
                                    lineHeight: 33
                                },
                                per: {
                                    color: '#eee',
                                    backgroundColor: '#334455',
                                    padding: [2, 4],
                                    borderRadius: 2
                                }
                            }
                        }
                    },

                    center: ['50%', '30%'],
                    data: sCircle
                });
                option.series.push({
                    name: '访问来源',
                    type: 'pie',
                    radius: ['35%', '45%'],
                    label: {
                        normal: {
                            formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
                            backgroundColor: '#eee',
                            borderColor: '#aaa',
                            borderWidth: 1,
                            borderRadius: 5,
                            rich: {
                                a: {
                                    color: '#999',
                                    lineHeight: 22,
                                    align: 'center'
                                },
                                hr: {
                                    borderColor: '#aaa',
                                    width: '100%',
                                    borderWidth: 0.5,
                                    height: 0
                                },
                                b: {
                                    fontSize: 16,
                                    lineHeight: 33
                                },
                                per: {
                                    color: '#eee',
                                    backgroundColor: '#334455',
                                    padding: [2, 4],
                                    borderRadius: 2
                                }
                            }
                        }
                    },
                    center: ['50%', '30%'],
                    data: bCircle
                });
                option1.series.push({
                    name: '2011年',
                    type: 'bar',
                    data: bValue
                });
            }
        }
        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_annulusRing1",
        "display_name": "EChartsAnnulusRing1",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsAnnulusRing1Widget(settings));
        }
    });
    //  自定义组件AnnulusRing（嵌套环形图自己写的）
    var eChartsAnnulusRingWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div><div style="position:absolute;left:260px;top:220px"><p>被管理对象类型</p></div></div>');
        var currentSettings = settings;
        var option = {
            title: {
                text: '警告信息',
                left: 'center',
            },
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            if (value && value.length > 0) {
                value = eval(value);
                var sCircle = value[0].smallCircle;
                var bCircle = value[1].bigCircle;
                //for(var i=0;i<value[0].smallCircle.length;i++){
                //    sCircle.push(value[0].smallCircle[i]);
                //};
                //for(var i=0;i<value[1].value.length;i++){
                //    seriesData.push(value[1].value[i]);
                //}
                option.series.push({
                        name: '访问来源',
                        type: 'pie',
                        radius: ['25%', '30%'],
                        label: {
                            normal: {
                                formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
                                backgroundColor: '#eee',
                                borderColor: '#aaa',
                                borderWidth: 1,
                                borderRadius: 5,
                                rich: {
                                    a: {
                                        color: '#999',
                                        lineHeight: 22,
                                        align: 'center'
                                    },
                                    hr: {
                                        borderColor: '#aaa',
                                        width: '100%',
                                        borderWidth: 0.5,
                                        height: 0
                                    },
                                    b: {
                                        fontSize: 16,
                                        lineHeight: 33
                                    },
                                    per: {
                                        color: '#eee',
                                        backgroundColor: '#334455',
                                        padding: [2, 4],
                                        borderRadius: 2
                                    }
                                }
                            }
                        },
                        data: sCircle
                    },
                    {
                        name: '访问来源',
                        type: 'pie',
                        radius: ['40%', '55%'],
                        label: {
                            normal: {
                                formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
                                backgroundColor: '#eee',
                                borderColor: '#aaa',
                                borderWidth: 1,
                                borderRadius: 5,
                                rich: {
                                    a: {
                                        color: '#999',
                                        lineHeight: 22,
                                        align: 'center'
                                    },
                                    hr: {
                                        borderColor: '#aaa',
                                        width: '100%',
                                        borderWidth: 0.5,
                                        height: 0
                                    },
                                    b: {
                                        fontSize: 16,
                                        lineHeight: 33
                                    },
                                    per: {
                                        color: '#eee',
                                        backgroundColor: '#334455',
                                        padding: [2, 4],
                                        borderRadius: 2
                                    }
                                }
                            }
                        },
                        data: bCircle
                    })
            }
        }
        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_annulusRing",
        "display_name": "EChartsAnnulusRing",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsAnnulusRingWidget(settings));
        }
    });
    // 自定义组件 Radar（单个雷达图）
    var eChartsRadarWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var currentSettings = settings;
        var option = {
            tooltip: {
                trigger: 'axis'
            },
            radar: [
                {
                    indicator: [
                        {text: 'cpu使用率', max: 100},
                        {text: '内存使用率', max: 100},
                        {text: '连续运营时间', max: 10}
                    ],
                    center: ['50%', '40%'],
                    radius: 80,
                    shape: 'circle',
                },
            ],
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            option.series.push(
                {
                    type: 'radar',
                    tooltip: {
                        trigger: 'item'
                    },
                    itemStyle: {
                        normal: {
                            areaStyle: {
                                type: 'default'
                            }
                        }
                    },
                    data: value
                },
            )
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_radar",
        "display_name": "EChartsRadar",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsRadarWidget(settings));
        }
    });
    // 自定义组件 Radar1（四个雷达图）
    var eChartsRadar1Widget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div>' +
            '<div style="position:absolute;left:360px;top:10px"><p>cpu使用率：95</p><p>内存使用率：95</p><p>持续运营时间：8小时20分</p></div>' +
            '<div style="position:absolute;left:130px;top:110px"><p>设备名</p></div>' +
            '<div style="position:absolute;left:360px;top:130px"><p>cpu使用率：95</p><p>内存使用率：95</p><p>持续运营时间：8小时20分</p></div>' +
            '<div style="position:absolute;left:130px;top:230px"><p>设备名</p></div>' +
            '<div style="position:absolute;left:360px;top:250px"><p>cpu使用率：95</p><p>内存使用率：95</p><p>持续运营时间：8小时20分</p></div>' +
            '<div style="position:absolute;left:130px;top:360px"><p>设备名</p></div>' +
            '<div style="position:absolute;left:360px;top:370px"><p>cpu使用率：95</p><p>内存使用率：95</p><p>持续运营时间：8小时20分</p></div>' +
            '<div style="position:absolute;left:130px;top:410px"><p>设备名</p></div>' +
            '</div>');
        var currentSettings = settings;
        var option = {
            tooltip: {
                trigger: 'axis'
            },
            radar: [
                {
                    indicator: [
                        {max: 100},
                        {max: 100},
                        {max: 10}
                    ],
                    shape: 'circle',
                    center: ['25%', '15%'],
                    radius: 40,
                },
                {
                    indicator: [
                        {max: 100},
                        {max: 100},
                        {max: 10}
                    ],

                    shape: 'circle',
                    center: ['25%', '40%'],
                    radius: 40,
                },
                {
                    indicator: [
                        {max: 100},
                        {max: 100},
                        {max: 10}
                    ],
                    shape: 'circle',
                    center: ['25%', '65%'],
                    radius: 40,
                },
                {
                    indicator: [
                        {max: 100},
                        {max: 100},
                        {max: 10}
                    ],
                    shape: 'circle',
                    center: ['25%', '90%'],
                    radius: 40,
                }
            ],
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            var value1 = value[0];
            var value2 = value[1];
            var value3 = value[2];
            var value4 = value[3];
            option.series.push(
                {
                    type: 'radar',
                    tooltip: {
                        trigger: 'item'
                    },
                    itemStyle: {normal: {areaStyle: {type: 'default'}}},
                    data: [value1]
                },
                {
                    type: 'radar',
                    tooltip: {
                        trigger: 'item'
                    },
                    itemStyle: {normal: {areaStyle: {type: 'default'}}},
                    radarIndex: 1,
                    data: [value2]
                },
                {
                    type: 'radar',
                    radarIndex: 2,
                    tooltip: {
                        trigger: 'item'
                    },

                    itemStyle: {normal: {areaStyle: {type: 'default'}}},
                    data: [value3]
                },
                {
                    type: 'radar',
                    radarIndex: 3,
                    tooltip: {
                        trigger: 'item'
                    },

                    itemStyle: {normal: {areaStyle: {type: 'default'}}},
                    data: [value4]
                }
            )
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_radar1",
        "display_name": "EChartsRadar1",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsRadar1Widget(settings));
        }
    });
    // 自定义组件 gauge（··自带的）
    var eChartsGaugeWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var option = {
            series: [{
                type: 'gauge',
                detail: {formatter: '{value}%'},
                data: []
            }]
        };
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            option.series[0].data = value
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }
        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    }
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_gauge",
        "display_name": "EChartsGauge",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsGaugeWidget(settings));
        }
    });
    //自定义组件 NightingaleRoseDiagram
    var eChartsNightingaleRoseDiagramWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var currentSettings = settings;
        var option = {
            series: []
        };
        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            option.series.push({
                data: value,
                name: '半径模式',
                type: 'pie',
                label: {
                    normal: {
                        formatter: '{abg|}\n{hr|}\n  {b|{b}：}{c} ',
                        rich: {}
                    }
                },
                radius: [50, 100],
                roseType: 'radius'
            })
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_NightingaleRoseDiagram",
        "display_name": "EChartsNightingaleRoseDiagram",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsNightingaleRoseDiagramWidget(settings));
        }
    });
    //测试
    /**
     * 原来的位置错了
     * @param settings
     */
    var eChartsCineWidget = function (settings) {
        var thisGaugeID = "gauge-" + gaugeID++;
        var htmlElement = $('<div class="custom-widget"><div class="custom-wrapper" id="' + thisGaugeID + '"></div></div>');
        var currentSettings = settings;
        var option = {
            xAxis: {
                type: 'category',
                boundaryGap: false
            },
            yAxis: {
                type: 'value'
            },
            series: []
        };

        this.render = function (element) {
            $(element).append(htmlElement);
            setTimeout(function () {
                var dom = document.getElementById(thisGaugeID);
                var myChart = echarts.init(dom);
                myChart.setOption(option, true);
            }, 1000);
        };

        this.onCalculatedValueChanged = function (settingName, newValue) {
            var value = newValue;
            if (value && value.length > 0) {
                value = eval(value)
                var xAxisData = [];
                var seriesData = [];
                $.each(value, function (i, item) {
                    xAxisData.push(item.name)
                    seriesData.push(item.value)
                });
                option.xAxis.data = xAxisData
                option.series.push({
                    data: seriesData,
                    type: 'line',
                    smooth: true
                })
            }
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.getHeight = function () {
            return Number(8)
        }

        this.onSettingsChanged(settings);
    };
    freeboard.loadWidgetPlugin({
        "type_name": "e_charts_Cine",
        "display_name": "EChartsCine",
        "fill_size": true,
        "settings": [
            {
                "name": "value",
                "display_name": "value",
                "type": "calculated",
                "description": "可以是文本HTML，也可以是输出HTML的javascript。"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new eChartsCineWidget(settings));
        }
    });
}());

