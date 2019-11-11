/**
 * Find an item in the files list. Scrolls down in case the item is not visible in viewport
 */
exports.command = async function (itemName) {
  // Escape double quotes inside of selector
  if (itemName.indexOf('"') > -1) {
    itemName = itemName.replace(/\\([\s\S])|(")/g, '\\$1$2')
  }

  await this.executeAsync(function (itemName, done) {
    const filesListContainer = document.querySelector('#files-list-container')
    const virtualScrollWrapper = document.querySelector('.vue-recycle-scroller__item-wrapper')
    let scrollDistance = filesListContainer.scrollTop

    function scrollUntilElementVisible () {
      const item = document.querySelector(`[filename="${itemName}"]`)

      if (item) {
        const position = item.getBoundingClientRect()
        // Add position from top to list container height to properly decide if the item is visible
        const tableHeaderPosition = document.querySelector('#files-table-header').getBoundingClientRect()
        const visiblePosition = filesListContainer.clientHeight + tableHeaderPosition.top

        // Check if the item is inside the view after it's renredered
        if (position.top > -1 && position.top <= visiblePosition) {
          done()
          return
        }
      }

      if (virtualScrollWrapper.scrollHeight <= scrollDistance) {
        done()
        return
      }

      scrollDistance += filesListContainer.clientHeight
      filesListContainer.scrollTop = scrollDistance
      setTimeout(function () {
        scrollUntilElementVisible()
      }, 500)
    }

    scrollUntilElementVisible()
  }, [itemName])

  return this
}
