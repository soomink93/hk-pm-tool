'use client'

// 폼 제출 전 확인창 (삭제 등 되돌릴 수 없는 동작)
export function ConfirmButton({ message, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return <button {...props} onClick={(e) => { if (!confirm(message)) e.preventDefault() }} />
}
