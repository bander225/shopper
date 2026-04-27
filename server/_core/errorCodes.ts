/**
 * نظام رموز الخطأ الداخلية للمنصة
 *
 * الرموز:
 *  500 - خطأ عام في الخادم
 *  501 - نفذ رصيد SMS (لا يُعرض للعميل — يُسجَّل في السجلات فقط)
 *  502 - فشل الاتصال بخدمة SMS
 *  503 - رقم الهاتف غير صالح
 *  504 - تجاوز الحد الأقصى لمحاولات OTP
 *  505 - رمز التحقق منتهي الصلاحية
 *  506 - رمز التحقق غير صحيح
 *  507 - قاعدة البيانات غير متاحة
 */

export const SMS_ERROR_CODES = {
  /** نفذ الرصيد — يُسجَّل في السجلات فقط، لا يُعرض للعميل */
  BALANCE_DEPLETED: 501,
  /** فشل الاتصال بخدمة SMS */
  SMS_SERVICE_UNAVAILABLE: 502,
  /** رقم الهاتف غير صالح */
  INVALID_PHONE: 503,
  /** تجاوز الحد الأقصى لمحاولات OTP */
  OTP_RATE_LIMIT: 504,
  /** رمز التحقق منتهي الصلاحية */
  OTP_EXPIRED: 505,
  /** رمز التحقق غير صحيح */
  OTP_INVALID: 506,
  /** قاعدة البيانات غير متاحة */
  DB_UNAVAILABLE: 507,
} as const;

export type SmsErrorCode = (typeof SMS_ERROR_CODES)[keyof typeof SMS_ERROR_CODES];

/**
 * تحليل استجابة Authentica.sa لتحديد رمز الخطأ المناسب
 * يعيد null إذا كانت الاستجابة ناجحة
 */
export function parseAuthenticaError(
  httpStatus: number,
  responseData: any
): { code: SmsErrorCode; internalOnly: boolean; message: string } | null {
  // نجاح
  if (httpStatus >= 200 && httpStatus < 300) return null;

  const msg: string =
    (responseData?.message ?? responseData?.error ?? "").toLowerCase();

  // 402 Payment Required أو رسائل تشير لنفاد الرصيد
  if (
    httpStatus === 402 ||
    msg.includes("balance") ||
    msg.includes("credit") ||
    msg.includes("insufficient") ||
    msg.includes("رصيد") ||
    msg.includes("نفذ")
  ) {
    return {
      code: SMS_ERROR_CODES.BALANCE_DEPLETED,
      internalOnly: true, // لا يُعرض للعميل
      message: `[SMS-501] نفذ رصيد SMS — ${responseData?.message ?? ""}`,
    };
  }

  // 429 Too Many Requests
  if (httpStatus === 429 || msg.includes("rate limit") || msg.includes("too many")) {
    return {
      code: SMS_ERROR_CODES.OTP_RATE_LIMIT,
      internalOnly: false,
      message: `[SMS-504] تجاوزت الحد الأقصى للمحاولات، انتظر قليلاً`,
    };
  }

  // رقم هاتف غير صالح
  if (msg.includes("invalid") && (msg.includes("phone") || msg.includes("number"))) {
    return {
      code: SMS_ERROR_CODES.INVALID_PHONE,
      internalOnly: false,
      message: `[SMS-503] رقم الهاتف غير صالح`,
    };
  }

  // خطأ عام في الخدمة
  return {
    code: SMS_ERROR_CODES.SMS_SERVICE_UNAVAILABLE,
    internalOnly: false,
    message: `[SMS-502] تعذّر إرسال رمز التحقق، حاول مجدداً`,
  };
}
