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
