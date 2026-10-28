export function Thumb({ item, size = '' }) {
  const className = `thumb${size ? ` ${size}` : ''}${item?.image ? ' photo' : ''}`
  if (item?.image) {
    return (
      <span className={className}>
        <img
          src={item.image}
          alt=""
          loading="lazy"
          onLoad={(event) => event.currentTarget.classList.add('is-loaded')}
          ref={(node) => {
            if (node?.complete && node.naturalWidth) node.classList.add('is-loaded')
          }}
        />
      </span>
    )
  }
  return <span className={className} data-cat={item?.category}>{item?.emoji || '🍽️'}</span>
}

export function readMenuPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Choose a JPG, PNG, or WebP photo.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 480
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const context = canvas.getContext('2d')
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = () => reject(new Error('Could not read that photo.'))
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
