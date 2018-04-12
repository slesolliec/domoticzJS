"use strict";

/*
    This module is to extend the Date() object without touching the original Date() in case
    it is also extended in another way by a third party application.
    I followed the good advices from https://stackoverflow.com/questions/6075231/how-to-extend-the-javascript-date-object
    The main hack is to fiddle with the prototype chain so the object is a myDate >> Date >> Object.
 */

/**
 * MyDate factory function.
 *
 * @param a
 * @param b
 * @param c
 * @param d
 * @param e
 * @param f
 * @param g
 * @returns {Date}
 * @constructor
 */
function MyDate(a, b, c, d, e, f, g) {
    var x;
    switch (arguments.length) {
        case 0:
            x = new Date();
            break;
        case 1:
            x = new Date(a);
            break;
        case 2:
            x = new Date(a, b);
            break;
        case 3:
            x = new Date(a, b, c);
            break;
        case 4:
            x = new Date(a, b, c, d);
            break;
        case 5:
            x = new Date(a, b, c, d, e);
            break;
        case 6:
            x = new Date(a, b, c, d, e, f);
            break;
        default:
            x = new Date(a, b, c, d, e, f, g);
    }
    // making x an "instance of" MyDate.prototype
    x.__proto__ = MyDate.prototype;
    // returning created object = factory pattern
    return x;
}

// making MyDate objects inherit from Date objects
MyDate.prototype.__proto__ = Date.prototype;

// so basically, MyDate is simply a Date object, which I can now safely extend
// without wrecking havocs in Date type.


/**
 * Returns the date as 20180402
 * @returns {string} Date as YYYYMMDD
 */
MyDate.prototype.stringDate8 = function() {
    let tmp = '';
    tmp += this.getFullYear();
    if (this.getMonth() < 10) {
        tmp += '0' + this.getMonth();
    } else {
        tmp += this.getMonth();
    }
    if (this.getDate() < 10) {
        tmp += '0' + this.getDate();
    } else {
        tmp += this.getDate();
    }
    return tmp;
};


/**
 * Returns the time as 05:02
 * @returns {string} Time as HH:MM
 */
MyDate.prototype.stringTime5 = function() {
    let tmp = '';
    if (this.getHours() < 10) {
        tmp += '0' + this.getHours() + ':';
    } else {
        tmp += this.getHours() + ':';
    }

    if (this.getMinutes() < 10) {
        tmp += '0' + this.getMinutes();
    } else {
        tmp += this.getMinutes();
    }
    return tmp;
};


/**
 * @returns {boolean} True if the year has a February 29th
 */
MyDate.prototype.isLeapYear = function() {
    let year = this.getFullYear();
    if( (year % 4) !== 0) return false;
    return ( (year % 100) !== 0 || (year % 400) === 0);
};


/**
 * Returns the days of the year.
 * Used to set on which line we are going to write the electricity consumption on the Google Calc sheet
 * @returns {number} Day of the year.
 */
MyDate.prototype.getDayOfYear = function() {
    let dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let mn = this.getMonth();
    let dn = this.getDate();
    let dayOfYear = dayCount[mn] + dn;
    if (mn > 1 && this.isLeapYear()) dayOfYear++;
    return dayOfYear;
};


/**
 * Heures Pleines ou Heures Creuses?
 * This is a French specific parameter to some electricity subscriptions:
 *     from 22:30 to 06:30, power is slightly cheaper
 * @returns {string}  'HC' between 22:30 and 06:30 and 'HP' otherwise
 */
MyDate.prototype.getHCHP = function () {
    if ( this.getHours() < 6 )  return 'HC';
    if ( (this.getHours() === 6  )  && (this.getMinutes() < 30) ) return 'HC';
    if ( (this.getHours() === 22 )  && (this.getMinutes() > 29) ) return 'HC';
    if ( this.getHours() > 22 ) return 'HC';

    return 'HP';
};


module.exports = MyDate ;