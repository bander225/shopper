import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
  aspectRatio?: "square" | "wide" | "banner";
}

export function ImageUpload({
  value,
  onChange,
  folder = "uploads",
  label = "رفع صورة",
  className = "",
  aspectRatio = "square",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = trpc.upload.image.useMutation({
    onSuccess: (data) => {
      onChange(data.url);
      toast.success("تم رفع الصورة بنجاح");
    },
    onError: (e) => toast.error("فشل رفع الصورة: " + e.message),
  });

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      uploadMutation.mutate({ base64, folder, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const aspectClass = {
    square: "aspect-square",
    wide: "aspect-video",
    banner: "aspect-[3/1]",
  }[aspectRatio];

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className={`relative rounded-xl overflow-hidden border border-border ${aspectClass} bg-muted`}>
          <img
            src={value}
            alt="صورة مرفوعة"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-lg text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              تغيير
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="rounded-lg text-xs"
              onClick={() => onChange("")}
            >
              <X className="w-3.5 h-3.5" />
              حذف
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`
            relative rounded-xl border-2 border-dashed transition-all cursor-pointer
            ${aspectClass}
            ${isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
            }
          `}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">جاري الرفع...</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground text-center">{label}</p>
                <p className="text-xs text-muted-foreground text-center">
                  اسحب وأفلت أو انقر للاختيار
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP — حتى 5MB</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
