'use client'

export default function CreditGuideModal({ onClose }: { onClose: () => void }) {
  const items = [
    { icon: '🎁', title: '新規登録ボーナス', desc: '登録時に +1クレジット 付与されます。' },
    {
      icon: '🎟️', title: 'フィードバック投稿でクーポン獲得',
      desc: 'セッション分析後にフィードバックを送ると、クレジット購入時に使える割引クーポンがもらえます。',
      extra: ['・通常：¥100クーポン', '・累計3回目：¥200クーポン', '・累計5回目：¥300クーポン', '（未使用5枚まで保有可能・有効期限30日）'],
    },
    { icon: '👥', title: '友達紹介ボーナス', desc: '紹介した友達が初回分析を完了すると +1クレジット 付与されます。紹介URLはプロフィールタブの「アカウント設定」からコピーできます。' },
    { icon: '💳', title: 'クレジット購入', desc: '1回分（¥500）、3回分（¥1,200）、10回分（¥3,500）のパックから選べます。プロフィールタブの「アカウント設定」から購入できます（クーポンコードをお持ちの場合は購入時に入力してください）。' },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt)' }}>クレジットの増やし方</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', margin: '0 0 4px' }}>{item.title}</p>
                <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>{item.desc}</p>
                {item.extra && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {item.extra.map(e => <span key={e} style={{ fontSize: 11, color: 'var(--txt3)' }}>{e}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <button onClick={onClose} className="btn-create" style={{ width: '100%' }}>閉じる</button>
        </div>
      </div>
    </div>
  )
}
