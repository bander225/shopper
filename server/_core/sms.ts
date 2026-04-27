/**
 * Authentica.sa SMS OTP Helper
 * API: https://api.authentica.sa/api/v2/
 * Docs: https://authenticasa.docs.apiary.io/
 */

import { parseAuthenticaError, SMS_ERROR_CODES } from "./errorCodes";

const AUTHENTICA_API_URL = "https://api.authentica.sa/api/v2";

// Note: The API key contains $ characters which dotenv may truncate.
// We use a raw string fallback to ensure the full key is used.
// The env var is still checked first to allow override.
const AUTHENTICA_KEY_FALLBACK = "\u00242y\u002410\u0024HNN9YeG25o8GHTfVJZmp.uozaYwFRP/LvC9U0vwdazA4nyJwj5ofi";

interface SendOTPResult {
  success: boolean;
  message: string;
  error?: string;
  /** رمز الخطأ الداخلي (501 = نفذ الرصيد، 502 = خدمة SMS غير متاحة، الخ) */
  errorCode?: number;
  /** إذا true: لا يُعرض للعميل — يُسجّل داخلياً فقط */
  internalOnly?: boolean;
}

interface VerifyOTPResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Send OTP via SMS using Authentica.sa
 * @param phone - International format e.g. +966501234567
 * @param otp - 6-digit OTP code (optional, Authentica can generate one)
 */
export async function sendSmsOtp(phone: string, otp: string): Promise<SendOTPResult> {
  // Use env var if it's the full key (60 chars), otherwise use fallback
  // dotenv truncates keys with $ characters
  const envKey = process.env.AUTHENTICA_API_KEY;
  const apiKey = (envKey && envKey.length >= 50) ? envKey : AUTHENTICA_KEY_FALLBACK;

  if (!apiKey) {
    console.error("[Authentica] AUTHENTICA_API_KEY is not set");
    return {
      success: false,
      message: "[SMS-502] خدمة الرسائل غير مضبوطة",
      error: "MISSING_API_KEY",
      errorCode: SMS_ERROR_CODES.SMS_SERVICE_UNAVAILABLE,
      internalOnly: false,
    };
  }
  
  console.log(`[Authentica] Using API key (length: ${apiKey.length})`);


  // Normalize phone to international format
  const normalizedPhone = normalizePhone(phone);

  try {
    const response = await fetch(`${AUTHENTICA_API_URL}/send-otp`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Authorization": apiKey,
      },
      body: JSON.stringify({
        method: "sms",
        phone: normalizedPhone,
        otp: otp, // Send our custom OTP so we can verify it locally
      }),
    });

    const data = await response.json() as any;
    console.log(`[Authentica] Send OTP to ${normalizedPhone} → status: ${response.status}`, data);

    if (response.ok && (data.success || data.status === "success" || data.message)) {
      return {
        success: true,
        message: `تم إرسال رمز التحقق إلى ${phone}`,
      };
    } else {
      // تحليل نوع الخطأ وتحديد رمزه
      const parsed = parseAuthenticaError(response.status, data);
      const errCode = parsed?.code ?? SMS_ERROR_CODES.SMS_SERVICE_UNAVAILABLE;
      const isInternal = parsed?.internalOnly ?? false;

      if (isInternal) {
        // رمز 501: نفذ الرصيد — يُسجّل داخلياً فقط
        console.error(`[SMS-${errCode}] خطأ داخلي: ${parsed?.message}`, data);
      } else {
        console.error(`[SMS-${errCode}] خطأ عام: ${parsed?.message}`, data);
      }

      return {
        success: false,
        message: isInternal
          ? "تعذّر إرسال رمز التحقق" // رسالة عامة للعميل (لا تكشف سبب 501)
          : (parsed?.message ?? `[SMS-${errCode}] فشل إرسال الرسالة`),
        error: JSON.stringify(data),
        errorCode: errCode,
        internalOnly: isInternal,
      };
    }
  } catch (err: any) {
    console.error(`[Authentica] Network error:`, err);
    return {
      success: false,
      message: `[SMS-502] فشل الاتصال بخدمة الرسائل`,
      error: err.message,
      errorCode: SMS_ERROR_CODES.SMS_SERVICE_UNAVAILABLE,
      internalOnly: false,
    };
  }
}

/**
 * Normalize phone number to international format (+966XXXXXXXXX)
 */
function normalizePhone(phone: string): string {
  // Remove spaces and dashes
  let p = phone.replace(/[\s\-]/g, "");

  // If starts with 05 or 5 (Saudi local), convert to +966
  if (p.startsWith("05")) {
    p = "+966" + p.slice(1);
  } else if (p.startsWith("5") && p.length === 9) {
    p = "+966" + p;
  } else if (p.startsWith("966") && !p.startsWith("+")) {
    p = "+" + p;
  } else if (!p.startsWith("+")) {
    // Assume Saudi if no country code
    p = "+966" + p;
  }

  return p;
}
