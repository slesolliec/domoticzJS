

Date.prototype.stringDate8 = function() {
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


Date.prototype.stringTime5 = function() {
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


Date.prototype.isLeapYear = function() {
    let year = this.getFullYear();
    if( (year % 4) !== 0) return false;
    return ( (year % 100) !== 0 || (year % 400) === 0);
};


// Get Day of Year
Date.prototype.getDayOfYear = function() {
    let dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let mn = this.getMonth();
    let dn = this.getDate();
    let dayOfYear = dayCount[mn] + dn;
    if (mn > 1 && this.isLeapYear()) dayOfYear++;
    return dayOfYear;
};