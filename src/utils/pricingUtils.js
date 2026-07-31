// src/utils/pricingUtils.js

export const safe = (val) => parseFloat(val) || 0;

export const calculatePlatformFee = (unitsConsumed, platformFeePerKw) => {
    const units = safe(unitsConsumed);
    const fee = safe(platformFeePerKw);
    if (!fee) return 0;
    if (units <= 0) return 0;
    const slabs = Math.ceil(units);
    return slabs * fee;
};

export const calculatePST = (unitsConsumed, pstRatePerKw) => {
    const units = safe(unitsConsumed);
    const fee = safe(pstRatePerKw);
    if (!fee) return 0;
    if (units <= 0) return 0;
    const slabs = Math.ceil(units);
    return slabs * fee;
};
