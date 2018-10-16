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

