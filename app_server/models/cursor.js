/**
 *cursor response model for navigating across the huge collections
 *using this metadata client will request first,next,previous or last records
 */
module.exports.cursorResponse = function () {
    this.next_cursor = 0;
    this.prev_cursor = 0;
    this.first_cursor = 0;
    this.last_cursor = 0;
};