// 댓글 본문에서 @이름 멘션을 강조 표시
const SPLIT = /(@[가-힣A-Za-z][가-힣A-Za-z0-9]{1,9})/g
const ONE = /^@[가-힣A-Za-z][가-힣A-Za-z0-9]{1,9}$/

export function MentionText({ text }: { text: string }) {
  const parts = text.split(SPLIT)
  return (
    <>
      {parts.map((p, i) =>
        ONE.test(p)
          ? <b key={i} className="font-semibold text-navy-light">{p}</b>
          : <span key={i}>{p}</span>,
      )}
    </>
  )
}
