//define([], function () {
bishopNavigation = (function () {
    "use strict";
    
    var api = {
        step: 30,
        dispersion: 30,
        debugPoints: false,
        minSpread: 1,
        maxSpread: 20
    }

    var currentElement = null;
    var keys = {
        up: 38,
        down: 40,
        left: 37,
        right: 39,
        enter: 13,
        esc: 17
    };

    function debugPoint(point, color) {
        if (api.debugPoints) {
            var debugElement = document.createElement('div');
            debugElement.className = 'debug-point';
            debugElement.style.top = point.y-1 + "px";
            debugElement.style.left = point.x-1 + "px";
            debugElement.style.background = color || "yellow";
            document.body.appendChild(debugElement);
        }
    }

    function clearDebugPoints() {
        var points = document.querySelectorAll('.debug-point');

        for(var i=0; i<points.length; i++) {
            points[i].remove();
        }
    }

    
    function defaultIsNavigable(element) {
        return element.classList.contains('navigable');
    }


    function getStartingPoint(element, direction) {
        var rect = element.getBoundingClientRect();
        var x;
        var y;

        switch(direction.x) {
            case -1:
                x = rect.left;
                break;

            case 0:
                x = rect.left + rect.width/2;
                break;

            case 1:
                x = rect.right;
                break;
        }

        switch(direction.y) {
            case -1:
                y = rect.top;
                break;

            case 0:
                y = rect.top + rect.height/2;
                break;

            case 1:
                y = rect.bottom;
                break;
        }

        return {
            x: x,
            y: y
        }
    }

    function isCloser(start, end, maybeCloser) {
        var xdiff = Math.abs(start.x - end.x);
        var ydiff = Math.abs(start.y - end.y);
        var xmaybe = Math.abs(start.x - maybeCloser.x);
        var ymaybe = Math.abs(start.y - maybeCloser.y);

        return (xdiff >= xmaybe) && (ydiff >= ymaybe);
    }


    function findNextNavigable(params) {
        var el;
        var bestMatch = {
            element: null,
            point: null,
        }
        var elements = [];
        var errorCount = 0;
        var point;
        var offset;
        var spread = params.spread;
        var direction = params.direction;
        
        for(var i=0; i<spread; i++) {
            el = null;
            offset = (i * api.dispersion) - ((spread-1) * api.dispersion * 0.5);

            point = {
                x: params.x + Math.abs(direction.y) * offset,
                y: params.y + Math.abs(direction.x) * offset
            }
            debugPoint(point);

            try {
                el = findNavigableFromPoint(point);

                if (el) {
                    if (bestMatch.element === null) {
                        bestMatch.element = el;
                        bestMatch.point = point;
                    } else if (isCloser(params, bestMatch.point, point)) {
                        bestMatch.element = el;
                        bestMatch.point = point;
                    }
                }

            } catch (e) {
                errorCount++;
            }
        }

        if (errorCount === spread) {
            throw new Error('out of bounds');
        }

        return bestMatch.element;
    }


    function findNavigableParent(el) {
        var element = el;

        while (true) {
            if (element === document.body || element === document.body.parentElement) {
                element = null;
                break;
            }
            
            if (api.isNavigable(element)) {
                break;
            }

            element = element.parentElement;
        }

        return element;
    }


    function findNavigableFromPoint(point) {
        var element = document.elementFromPoint(point.x, point.y);

        if (element === null) {
            throw new Error('out of bounds');
        }

        return findNavigableParent(element);
    }

    function blur(element, type) {
        var event;

        if (!api.isNavigable(element)) {
            throw new Error('cannot blur not navigable element');
        }

        if (currentElement !== element) {
            throw new Error('Cannot blur element not focused');
        }

        element.classList.remove('focused');
        currentElement = null;

        event = new CustomEvent('blur');
        event.customType = type;
        element.dispatchEvent(event);
    }

    function focus(element, type) {
        var event;

        if (!api.isNavigable(element)) {
            throw new Error('cannot focus not navigable element');
        }

        if (currentElement !== null) {
            blur(currentElement, type);
        }

        currentElement = element;
        element.classList.add('focused');

        event = new CustomEvent('focus');
        event.customType = type;
        element.dispatchEvent(event);
    }


    function navigate(direction) {
        var i=0;
        var el;
        var start = getStartingPoint(currentElement, direction);
        var spread = 0;
        var minSpread = ~~currentElement.getAttribute('nav-min-spread') || api.minSpread;
        var maxSpread = ~~currentElement.getAttribute('nav-max-spread') || api.maxSpread;

        clearDebugPoints();
        debugPoint(start, 'green');

        while(true) {
            i++;
            spread++;

            if (spread < minSpread) {
                spread = minSpread;
            }

            if (spread > maxSpread) {
                spread = maxSpread;
            }

            try {
                el = findNextNavigable({
                    x: start.x + direction.x * api.step * i,
                    y: start.y + direction.y * api.step * i,
                    spread: spread,
                    direction: direction
                });

                if (el && el !== currentElement) {
                    blur(currentElement, 'keyboard');
                    focus(el, 'keyboard');
                    break;
                }

            } catch (e) {
                console.log('Not found element');
                break;
            }

            if (i > 1000) {
                console.error("Something went wrong, infinite loop!");
                break;
            }
        }
    }

    function createNaviEvent(keyEvent) {
        var event = new CustomEvent('navigate', {
            bubble: true,
            cancelable: true
        });
        event.keyCode = keyEvent.keyCode

        return event;
    }

    function attributeNavigation(event) {
        var direction = null;
        var selector;
        var el;

        switch(event.keyCode) {
            case keys.up:
                direction = 'up';
                break;

            case keys.down:
                direction = 'down';
                break;

            case keys.left:
                direction = 'left';
                break;

            case keys.right:
                direction = 'right';
                break;
        }
        
        if (direction) {
            selector = currentElement.getAttribute('nav-' + direction);

            if (selector) {
                el = document.querySelector(selector);

                if (el) {
                    blur(currentElement, 'keyboard');
                    focus(el, 'keyboard');

                    event.preventDefault();
                }
            }
        }
    }


    function defaultNavigation(event) {
        switch(event.keyCode) {

            case keys.up:
                navigate({x: 0, y: -1});
                break;

            case keys.down:
                navigate({x: 0, y: 1});
                break;

            case keys.left:
                navigate({x: -1, y: 0});
                break;

            case keys.right:
                navigate({x: 1, y: 0});
                break;
        }
    }


    function keyHandler(keyboardEvent) {
        var event;

        if (currentElement !== null) {
            event = createNaviEvent(keyboardEvent);
            currentElement.dispatchEvent(event);

            if (event.defaultPrevented === false) {
                attributeNavigation(event);
            }

            if (event.defaultPrevented === false) {
                defaultNavigation(event);
            }
        }
    }

    function mouseHandler(mouseEvent) {
        var element = mouseEvent.target || mouseEvent.srcElement;
        var navigableElement = findNavigableParent(element);
        
        if (navigableElement && navigableElement !== currentElement) {
            focus(navigableElement, 'mouse');
        }
    }

    function init() {
        document.addEventListener('keydown', keyHandler);
        document.body.addEventListener('mousemove', mouseHandler);
    }

    api.isNavigable = defaultIsNavigable;
    api.focus = focus;
    api.blur = blur;
    api.init = init;

    return api;
}());

