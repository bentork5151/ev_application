/**
 * Utility functions for slot bookings.
 */

/**
 * Determines whether a slot booking is expired based on status or date/time.
 * Returns true if status is CANCELLED, COMPLETED, REJECTED, EXPIRED, 
 * or if current time is past the slot end time.
 */
export const isBookingExpired = (booking) => {
    if (!booking) return true;
    const status = (booking.status || '').toUpperCase();

    // 1. Explicit terminal / inactive statuses
    if (status === 'CANCELLED' || status === 'COMPLETED' || status === 'REJECTED' || status === 'EXPIRED') {
        return true;
    }

    // 2. Extract potential end and start time sources
    const slotEndTimeSource = booking.slotEndTime ||
        booking.slot_end_time ||
        booking.slot?.endTime ||
        booking.slot?.end_time ||
        booking.slot?.endTimeOnly ||
        booking.endTime ||
        booking.end_time;

    const slotStartTimeSource = booking.slotStartTime ||
        booking.slot_start_time ||
        booking.slot?.startTime ||
        booking.slot?.start_time ||
        booking.slot?.startTimeOnly ||
        booking.startTime ||
        booking.start_time;

    const baseDateSource = booking.bookingDate ||
        booking.booking_date ||
        booking.date ||
        booking.slotDate ||
        booking.slot_date ||
        booking.slot?.date ||
        booking.bookingTime ||
        booking.booking_time ||
        booking.createdAt;

    const parseToDate = (timeVal, baseVal) => {
        if (!timeVal) return null;
        try {
            if (Array.isArray(timeVal)) {
                const [y, M, d, h, m, s] = timeVal;
                return new Date(y, M - 1, d, h, m, s || 0);
            }
            if (typeof timeVal === 'number') {
                return new Date(timeVal);
            }
            if (timeVal instanceof Date) {
                return timeVal;
            }
            if (typeof timeVal === 'string') {
                const timeOnlyRegex = /^([01]\d|2[0-3])[:.]([0-5]\d)([:.]([0-5]\d))?$/;
                if (timeOnlyRegex.test(timeVal)) {
                    let baseD = new Date();
                    if (baseVal) {
                        const parsedBase = parseToDate(baseVal, null);
                        if (parsedBase && !isNaN(parsedBase.getTime())) {
                            baseD = parsedBase;
                        }
                    }
                    const parts = timeVal.split(/[:.]/).map(Number);
                    return new Date(baseD.getFullYear(), baseD.getMonth(), baseD.getDate(), parts[0], parts[1], parts[2] || 0);
                }
                const safeDateStr = timeVal.replace(' ', 'T');
                const parsed = new Date(safeDateStr);
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn("Error parsing date in isBookingExpired:", e);
        }
        return null;
    };

    const endDate = parseToDate(slotEndTimeSource, baseDateSource);
    const startDate = parseToDate(slotStartTimeSource, baseDateSource);
    const now = new Date();

    if (endDate && !isNaN(endDate.getTime())) {
        return now.getTime() > endDate.getTime();
    }

    if (startDate && !isNaN(startDate.getTime())) {
        // Default to 1 hour after start time if no end time specified
        const defaultEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
        return now.getTime() > defaultEnd.getTime();
    }

    return false;
};
