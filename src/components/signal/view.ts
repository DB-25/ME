/** Camera constants shared by the field and by anything that places points in screen pixels. */
export const CAMERA_FOV = 38;
export const BASE_CAMERA_Z = 7;
export const HALF_TAN_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);
/** World units that span one viewport height at the base camera distance. */
export const BASE_VISIBLE_H = 2 * BASE_CAMERA_Z * HALF_TAN_FOV;
