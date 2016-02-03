/**
 * @file Timeouter
 * @author Piotr Nowacki (p.nowacki@samsung.com)
 * @date 2015-11-26
 *
 * @copyright Copyright (c) 2015 Samsung Electronics, Visual Display Division. All Rights Reserved.
 *
 * @description module designed to provide control over showing and automatically hiding elements.
 * Acts on provided elements, adding and removing ".outside-view" class.
 * Provided elements' styles need to be defined.
 *
 * @example
 * //required custom css example
 * //.video-controls {position: fixed; top: 0; left: 0; -webkit-transition: top 0.5s; transition: top 0.5s;}
 * //.video-controls.outside-view {top: -100px;}
 *
 * //initialization
 * var timeouterControls = Timeouter(document.querySelectorAll('.video-controls'));
 * var timeouterTitle = Timeouter(document.querySelector('.video-title'));
 * //show elements for a while
 * myTimeouterControls.set();
 * //show elements permanently
 * myTimeouterControls.clear();
 */

var Timeouter = function (DOMSelection) {
    var DOMSelectionTypes = {
        node: {
            applyToElement: function (node, callback) {
                callback(node);
            }
        },
        nodeList: {
            applyToAll: function (nodes, callback) {
                var i, iMax = nodes.length;

                for (i = 0; i < iMax; i += 1) {
                    callback(nodes[i]);
                }
            }
        }
    };
    var nodes;
    var timeout;

    var updateDOM = function () {};

    var init = function (DOMSelection) {
        nodes = DOMSelection;

        try {
            if (Array.prototype.toString.call(nodes) === '[object NodeList]') {
                updateDOM =  DOMSelectionTypes.nodeList.applyToAll;
            } else if (typeof nodes.nodeType !== 'undefined') {
                updateDOM = DOMSelectionTypes.node.applyToElement;
            } else {
                throw({ name: 'Initialization error', message: 'Node or NodeList required' });
            }
        } catch(e) {
            console.error(e);
        }
    };

    var clear = function () {
        window.clearTimeout(timeout);
        
        updateDOM(nodes, function (node) {
            node.classList.remove('outside-view');
        });
    };

    var set = function () {
        clear();
        timeout = setTimeout(function () {
            updateDOM(nodes, function (node) {
                node.classList.add('outside-view');
            });
        }, 5000);
    };

    init(DOMSelection);

    return {
        clear: clear,
        set: set
    };
};
