(function ($) {
        $.fn.easyAlert = $.easyAlert = function (optionsOrMessage, alertType, position) {


            var hasJqueryUI = typeof jQuery.ui !== typeof undefined;
            var settings = {};
            if (typeof optionsOrMessage === "string") {
                settings = $.extend({}, $.fn.easyAlert.defaults,
                    {
                        'message': optionsOrMessage,
                        'alertType': typeof alertType === typeof undefined ? 'success' : alertType,
                        'position': typeof position === typeof undefined ? 'b r' : position
                    }
                );
            } else if (typeof optionsOrMessage === "object" || typeof optionsOrMessage === typeof undefined) {
                settings = $.extend({}, $.fn.easyAlert.defaults, optionsOrMessage);
            }
            var alertContainer = '<div class="easy-alert">' +
                '<div class="alert alert-' + settings.alertType + '">'
                + settings.message + '</div>' +
                '</div>';
            //jQuery object container
            var $alertContainer = $(alertContainer);

            var positionsArray = settings.position.split(' ');
            var vPos = typeof vPositions[positionsArray[0]] === typeof undefined ? 'top' : vPositions[positionsArray[0]];
            var hPos = typeof hPositions[positionsArray[1]] === typeof undefined ? 'right' : hPositions[positionsArray[1]];
            if (positionsArray.length !== 2) {
                console.error('invalid position argument');
                return;
            }
            //in case auto hide set to false and click to hide set to false then auto hide will be set to ture
            (settings.clickToHide | settings.autoHide) === 0 ? settings.autoHide = true : '';

            /*Todo complete rest of configuration*/

            if (typeof this.selector === typeof undefined) {
                //Global alert called via $.easyAlert(...);
                var globalPositionClass;
                var containerStyle = {
                    position: 'fixed',
                    'min-width': settings.globalMinWidth,
                    display: 'none'
                };
                /*Todo Complete mobile global alert position*/
                if (vPos === "top") {
                    containerStyle.top = "5px";
                    globalPositionClass = 'easy-alert-t';
                    $alertContainer.attr('data-vertical', 'top');
                } else {
                    containerStyle.bottom = "5px";
                    globalPositionClass = 'easy-alert-b';
                    $alertContainer.attr('data-vertical', 'bottom');
                }
                if (hPos === "center") {
                    //center alert
                    containerStyle.left = "50%";
                    containerStyle.transform = 'translateX(-50%)';
                    globalPositionClass += '-c';
                } else if (hPos === "left") {
                    //left alert
                    containerStyle.left = "5px";
                    globalPositionClass += '-l';
                } else {
                    //right alert
                    containerStyle.right = "5px";
                    globalPositionClass += '-r';
                }
                var hasLeftOrRightAnimationShow = hasLeftOrRightAnimationHide = false;
                if ($.inArray(settings.showAnimation, ['drop', 'fold', 'scale', 'size', 'slide']) > -1)
                    hasLeftOrRightAnimationShow = true;
                if ($.inArray(settings.hideAnimation, ['drop', 'fold', 'scale', 'size', 'slide']) > -1)
                    hasLeftOrRightAnimationHide = true;
                var allGlobalAlerts = $('.' + globalPositionClass);
                var alertsCount = allGlobalAlerts.length;
                var calculatedPos = settings.globalSpace;
                for (var i = 0; i < alertsCount; i++) {
                    calculatedPos += $(allGlobalAlerts[i]).height() + settings.globalSpace;
                }
                containerStyle.hasOwnProperty('top') ? containerStyle.top = calculatedPos + "px" : containerStyle.bottom = calculatedPos + "px";
                $alertContainer.addClass(globalPositionClass);
                $alertContainer.css(containerStyle);
                var hideAlert = function () {
                    if (!hasJqueryUI)
                        $alertContainer.fadeOut(settings.hideDuration, completeHideAlert);
                    else {
                        var hideOptions = {
                            effect: settings.hideAnimation,
                            duration: settings.hideDuration,
                            complete: completeHideAlert
                        };
                        if (hasLeftOrRightAnimationHide)
                            hideOptions.direction = hPos;
                        $alertContainer.toggle(hideOptions);
                    }
                };
                var isHidden = false;
                var completeHideAlert = function () {
                    var currentVert = $alertContainer.attr('data-vertical');
                    var currentVertVal = $alertContainer.css(currentVert);
                    $alertContainer.remove();
                    (typeof settings.hidden === 'function' && !isHidden) ? settings.hidden.call(this, this, settings.message) : null;
                    isHidden = true;
                    shiftGlobalAlerts('.' + globalPositionClass, currentVert, parseInt(currentVertVal), settings.globalSpace);
                };
                if (settings.clickToHide) {
                    $alertContainer.on('click', function () {
                        typeof settings.clicked === 'function' ? settings.clicked.call(this, this, settings.message) : null;
                        hideAlert();
                    });
                }
                if (settings.autoHide) {
                    setTimeout(hideAlert, settings.time);
                }
                var showOptions = {
                    effect: settings.showAnimation,
                    duration: settings.showDuration
                };
                typeof settings.complete === 'function' ? showOptions.complete = function () {
                        settings.complete.call(this, settings.message, this);
                    } : null;
                if (hasLeftOrRightAnimationShow)
                    showOptions.direction = hPos;
                $alertContainer.appendTo('body').show(showOptions);
                return settings.message;
            }
            return this;
        };

        var shiftGlobalAlerts = function (selector, verticalDirection, currentVerticalVal, globalSpace) {
            $(selector).each(function () {
                var currentAlertHeight = Number($(this).height()) + Number(globalSpace);
                var currentAlertVertVal = parseInt($(this).css(verticalDirection));
                if (currentVerticalVal < currentAlertVertVal && currentAlertVertVal - currentAlertHeight >= globalSpace) {
                    if (verticalDirection === "top")
                        $(this).animate({'top': (currentAlertVertVal - currentAlertHeight) + 'px'}, 300);
                    else
                        $(this).animate({'bottom': (currentAlertVertVal - currentAlertHeight) + 'px'}, 300);
                }
            });
        };


        //vertical position
        var vPositions = {
            't': 'top',
            'm': 'middle',
            'b': 'bottom'
        };
        //horizontal position
        var hPositions = {
            'l': 'left',
            'c': 'center',
            'r': 'right'
        }

        // Defaults parameters are here, You can override them for your own purpose.
        $.fn.easyAlert.defaults = {
            'message': "Easy alert-js By Ali Dalal",
            'alertType': 'success',
            'position': "b r",
            globalMinWidth: '250px',
            clickToHide: true,
            autoHide: false,
            time: 5000,
            showAnimation: 'fade',
            showDuration: 300,
            hideAnimation: 'fade',
            hideDuration: 300,
            globalSpace: 5,
            complete: null,
            clicked: null,
            hidden: null
        };
        // End of defaults
    }(jQuery)
);