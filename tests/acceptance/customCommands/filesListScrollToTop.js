/**
 * Scroll the files list to the beginning
 */
exports.command = async function () {
  await this.page.FilesPageElement.filesList().waitForElementPresent('@filesTableContainer')

  await this.executeAsync(function (done) {
    const filesListScroll = document.querySelector('#files-list-container')
    if (filesListScroll.scrollTop > 0) {
      filesListScroll.scrollTop = 0
    }

    done()
  })

  return this
}
