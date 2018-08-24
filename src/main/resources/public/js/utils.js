/*****************************************************************************
 ***
 *** Create the utils object to act as a namespace for this file
 ***
 *****************************************************************************/

var utils = {};

utils.enable_element = function (element_id) {
    var element = document.getElementById(element_id);
    element.disabled = false;
    element.style.opacity = 1.0;
    return null;
};

utils.disable_element = function (element_id) {
    var element = document.getElementById(element_id);
    element.disabled = true;
    element.style.opacity = 0.5;
    return null;
};

utils.show_element = function (element_id) {
    var element = document.getElementById(element_id);
    element.style.visibility = "visible";
};

utils.hide_element = function (element_id) {
    var element = document.getElementById(element_id);
    element.style.visibility = "hidden";
};

utils.highlight_border = function (element_id) {
    var element = document.getElementById(element_id);
    var shadow_style = "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset";
    element.style.boxShadow = shadow_style;
    return null;
};

utils.lowlight_border = function (element_id) {
    var element = document.getElementById(element_id);
    element.style.boxShadow = "initial";
    return null;
};

utils.blink_border = function (element_id) {
    utils.highlight_border(element_id);
    setTimeout(function () { utils.lowlight_border(element_id); }, 500);
    return null;
};
