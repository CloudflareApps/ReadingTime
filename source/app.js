import countable from 'countable'

(function () {
  if (!window.addEventListener) return

  let options = INSTALL_OPTIONS
  let element
  let textContainer
  let observer
  let opacityTimeout
  let target

  function getOffsetTop (element) {
    let offsetTop = 0

    do {
      if (!isNaN(element.offsetTop)) offsetTop += element.offsetTop
    }
    while (element = element.offsetParent) // eslint-disable-line no-cond-assign

    return offsetTop
  }

  function getScrollPercentage (element) {
    // Consider the element's offset from the body and the portion visible from the viewport.
    const offsetTop = getOffsetTop(element) - document.documentElement.clientHeight
    // Consider if the element is beyond the viewport.
    const currentY = Math.max(document.body.scrollTop - offsetTop, 0)
    const scrollPercentage = currentY / (element.scrollHeight || element.clientHeight)

    // Consider if the body is scrolled beyond the element.
    return Math.min(scrollPercentage, 1)
  }

  function getTextEstimates (element, percentageRead, next) {
    countable.once(element, ({words}) => {
      const minutes = words / options.advancedOptions.wordsPerMinute * (1 - percentageRead)
      next({minutes, wordCount: words})
    })
  }

  function render () {
    clearTimeout(opacityTimeout)

    element.style.opacity = 1

    if (options.visibleDuration !== '-1') {
      opacityTimeout = setTimeout(() => { element.style.opacity = 0 }, +options.visibleDuration)
    }

    function renderTemplate ({minutes, wordCount}) {
      let {strings} = options

      if (!strings || !options.localize) {
        strings = {
          finished: '',
          lessThanAMinute: 'A few seconds left',
          oneMinute: '1 minute left',
          manyMinutes: '$MINUTES minutes left'
        }
      }

      const roundedMinutes = Math.round(minutes)
      let template

      if (minutes === 0) {
        template = strings.finished
      } else if (wordCount < options.advancedOptions.wordsPerMinute || minutes < 1) {
        template = strings.lessThanAMinute
      } else {
        template = roundedMinutes === 1 ? strings.oneMinute : strings.manyMinutes
      }

      if (template) {
        textContainer.innerHTML = template.replace(/\$MINUTES/g, roundedMinutes)
      } else {
        element.style.opacity = 0
      }
    }

    getTextEstimates(target, getScrollPercentage(target), renderTemplate)
  }

  function updateElement () {
    element = INSTALL.createElement(element, element)
    element.setAttribute('app', 'reading-time')
    element.setAttribute('data-position', options.position)

    textContainer = document.createElement('message-container')
    element.appendChild(textContainer)

    if (options.showBackground) textContainer.style.backgroundColor = options.backgroundColor

    document.body.appendChild(element)

    observer && observer.disconnect()
    window.removeEventListener('scroll', render)
    window.removeEventListener('resize', render)
  }

  function bootstrap () {
    updateElement()

    const selector = options.advancedOptions && options.advancedOptions.element

    if (selector && options.advancedOptionsToggle) {
      target = document.querySelector(selector)

      if (!target) {
        // Target is not yet in the DOM and is most likely being rendered with JS.
        observer && observer.disconnect()

        observer = new window.MutationObserver(() => document.querySelector(selector) && bootstrap())

        return observer.observe(document.body, {childList: true})
      }
    } else {
      target = document.body
    }

    window.addEventListener('scroll', render)
    window.addEventListener('resize', render)
  }

  // Since we're adding an element to the body, we need to wait until the DOM is
  // ready before inserting our widget.

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap)
  } else {
    bootstrap()
  }

  // This is used by the preview to enable live updating of the app while previewing.
  // See the preview.handlers section of the install.json file to see where it's usedocument.
  window.INSTALL_SCOPE = {
    setOptions (nextOptions) {
      options = nextOptions
      bootstrap()
    }
  }
}())
