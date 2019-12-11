const { client } = require('nightwatch-api')
const { When, Given, Then } = require('cucumber')
const fetch = require('node-fetch')
const assert = require('assert')
const { URLSearchParams } = require('url')
require('url-search-params-polyfill')
const httpHelper = require('../helpers/httpHelper')
const userSettings = require('../helpers/userSettings')
const sharingHelper = require('../helpers/sharingHelper')
const { SHARE_TYPES } = require('../helpers/sharingHelper')
const { runOcc } = require('../helpers/occHelper')
const _ = require('lodash')
const path = require('../helpers/path')
const util = require('util')

/**
 *
 * @param {string} file
 * @param {string} sharee
 * @param {boolean} shareWithGroup
 * @param {string} role
 * @param {string} permissions
 */
const userSharesFileOrFolderWithUserOrGroup = function (file, sharee, shareWithGroup, role, permissions = undefined) {
  return client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(file)
    .shareWithUserOrGroup(sharee, shareWithGroup, role, permissions)
}

/**
 *
 * @param {string} file
 * @param {string} sharee
 * @param {string} role
 */
const userSharesFileOrFolderWithUser = function (file, sharee, role) {
  return userSharesFileOrFolderWithUserOrGroup(file, sharee, false, role)
}

/**
 *
 * @param {string} file
 * @param {string} sharee
 * @param {string} role
 */
const userSharesFileOrFolderWithGroup = function (file, sharee, role) {
  return userSharesFileOrFolderWithUserOrGroup(file, sharee, true, role)
}
/**
 * creates a new share
 *
 * @param {string} elementToShare  path of file/folder being shared
 * @param {string} sharer  username of the sharer
 * @param receiver  username of the receiver
 * @param shareType  Type of share 0 = user, 1 = group, 3 = public (link), 6 = federated (cloud share).
 * @param {string} permissionString  permissions of the share for valid permissions see sharingHelper.PERMISSION_TYPES
 * @param {string} name name of the link (for public links), default = "New Share"
 * @param {object} extraParams Extra parameters allowed on the share
 * @param {string} extraParams.password Password of the share (public links)
 * @param {string} extraParams.expireDate Expiry date of the share
 */
const shareFileFolder = function (
  elementToShare, sharer, receiver = null, shareType = SHARE_TYPES.user,
  permissionString = 'all', name = null, extraParams = {}
) {
  const params = new URLSearchParams()
  elementToShare = path.resolve(elementToShare)
  const permissions = sharingHelper.humanReadablePermissionsToBitmask(permissionString)
  params.append('path', elementToShare)
  if (receiver) {
    params.append('shareWith', receiver)
  }
  params.append('shareType', shareType)
  params.append('permissions', permissions)
  if (name) {
    params.append('name', name)
  }
  for (const key in extraParams) {
    if (extraParams[key]) {
      params.append(key, extraParams[key])
    }
  }
  return fetch(
    client.globals.backend_url + '/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json',
    { method: 'POST', headers: httpHelper.createAuthHeader(sharer), body: params }
  )
    .then(res => res.json())
    .then(function (json) {
      httpHelper.checkOCSStatus(json, 'Could not create share. Message: ' + json.ocs.meta.message)
    })
}
/**
 * sets up data into a standard format for creating new public link share
 *
 * @param {string} sharer user creating share
 * @param {object} data fields table with required share properties
 * @param {string} data.name Name of the new share(public links)
 * @param {string} data.shareType Type of share
 * @param {string} data.shareWith Receiver of the share
 * @param {string} data.path Path of file/folder/resource to be shared
 * @param {string} data.password Password of the share
 * @param {string} data.permissions Allowed permissions on the share
 * @param {string} data.expireDate Expiry date of the share
 */
const createPublicLink = function (sharer, data) {
  let { path, permissions = 'read', name, password, expireDate } = data

  if (typeof expireDate !== 'undefined') {
    expireDate = sharingHelper.calculateDate(expireDate)
  }

  return shareFileFolder(
    path,
    sharer,
    null,
    SHARE_TYPES.public_link,
    permissions,
    name,
    {
      password,
      expireDate
    }
  )
}
/**
 *
 * @param {string} type user|group
 * @param {string} name
 * @param {string} role
 * @returns {Promise}
 */
const assertCollaboratorslistContains = function (type, name, role) {
  return client.page.FilesPageElement.sharingDialog().getCollaboratorsList()
    .then(shares => {
      const cleanedShares = []
      for (var i = 0; i < shares.length; i++) {
        cleanedShares.push(shares[i].replace(/\n/g, ' '))
        // depending on the browser there are extra \n or not, so get rid of them all
      }
      let expectedString = name + ' ' + role
      if (type === 'user') {
        expectedString = expectedString + client.page.FilesPageElement.sharingDialog().getUserSharePostfix()
      } else if (type === 'group') {
        expectedString = expectedString + client.page.FilesPageElement.sharingDialog().getGroupSharePostfix()
      } else {
        throw new Error('illegal type')
      }
      expectedString = expectedString.replace('\n', ' ')
      if (!shares || !cleanedShares.includes(expectedString)) {
        assert.fail(
          `"${name}" was expected to be in share list but was not present. Found collaborators text:"` + shares + '"'
        )
      }
    })
}

/**
 *
 * @param {string} type
 * @param {string} name
 * @returns {Promise}
 */
const assertCollaboratorslistDoesNotContain = function (type, name) {
  return client.page.FilesPageElement.sharingDialog().getCollaboratorsList()
    .then(shares => {
      if (shares) {
        var searchregex
        if (type === 'user') {
          searchregex = new RegExp(name + '\n.*' + client.page.FilesPageElement.sharingDialog().getUserSharePostfix())
        } else if (type === 'group') {
          searchregex = new RegExp(name + '\n.*' + client.page.FilesPageElement.sharingDialog().getGroupSharePostfix())
        } else {
          throw new Error('illegal type')
        }
        shares.map(share => {
          assert.strictEqual(
            searchregex.test(share),
            false,
            `"${name}" not expected to be in the share list but is present`
          )
        })
      }
    })
}

/**
 *
 * @param {('user'|'group')} type
 * @param {string} displayName
 * @return {Promise<boolean>}
 */
const checkIsListedInAutoComplete = function (type, displayName) {
  return client.page.FilesPageElement.sharingDialog().getShareAutocompleteItemsList()
    .then(itemsList => {
      if (itemsList.length === 0) {
        return false
      }
      let displayNameWithType
      if (type === 'user') {
        displayNameWithType = displayName + '\nUser'
      } else {
        displayNameWithType = displayName + '\nGroup'
      }
      return itemsList.includes(displayNameWithType)
    }
    )
}

/**
 * Get all the users whose userID or display name matches with the pattern entered in the search field and then
 * return the display names of the result(users)
 *
 * @param {string} pattern
 * @return {string[]} groupMatchingPattern
 */
const getUsersMatchingPattern = function (pattern) {
  // check if all created users that contain the pattern either in the display name or the username
  // are listed in the autocomplete list
  // in both cases the display name should be listed
  const users = userSettings.getCreatedUsers()
  const usersID = Object.keys(users)
  return usersID.filter(
    id => users[id].displayname.toLowerCase().includes(pattern) || id.includes(pattern)
  ).map(
    id => users[id].displayname
  )
}

/**
 * Get all the groups whose name matches with the pattern entered in the search field
 *
 * @param {string} pattern
 * @return {string[]} groupMatchingPattern
 */
const getGroupsMatchingPattern = function (pattern) {
  const groups = userSettings.getCreatedGroups()
  const groupMatchingPattern = groups.filter(group => group.toLowerCase().includes(pattern))
  return groupMatchingPattern
}

/**
 * Checks if the users found in the autocomplete list consists of all the created users whose display name or userId
 * matches with the pattern
 *
 * @param {string} usersMatchingPattern
 *
 */
const assertUsersInAutocompleteList = async function (usersMatchingPattern) {
  const itemsList = await client.page.FilesPageElement.sharingDialog().getShareAutocompleteItemsList()
  const userPostfix = client.page.FilesPageElement.sharingDialog().getUserSharePostfix()
  const usersNotFound = _.difference(
    usersMatchingPattern.map(name => name + userPostfix),
    itemsList
  )
  assert.strictEqual(usersNotFound.length, 0, `could not find ${usersNotFound} in the itemsList`)
}

/**
 * Checks if the groups found in the autocomplete list consists of all the created groups whose name
 * matches with the pattern
 *
 * @param {string} groupMatchingPattern
 *
 */
const assertGroupsInAutocompleteList = async function (groupMatchingPattern) {
  const itemsList = await client.page.FilesPageElement.sharingDialog().getShareAutocompleteItemsList()
  const groupPostfix = client.page.FilesPageElement.sharingDialog().getGroupSharePostfix()
  const groupsNotFound = _.difference(
    groupMatchingPattern.map(name => name + groupPostfix),
    itemsList
  )
  assert.strictEqual(groupsNotFound.length, 0, `could not find ${groupsNotFound} in the itemsList`)
}

/**
 * Checks if the users or groups found in the autocomplete list consists of all the created users and groups
 *  with the matched pattern except the current user name and the already shared user or group name
 *
 * @param {string} pattern
 * @param {string} alreadySharedUserOrGroup
 * @param {string} userOrGroup
 */
const assertUsersGroupsWithPatternInAutocompleteListExcluding = async function (pattern, alreadySharedUserOrGroup, userOrGroup) {
  const itemsList = await client.page.FilesPageElement.sharingDialog().getShareAutocompleteItemsList()
  const currentUserDisplayName = userSettings.getDisplayNameForUser(client.globals.currentUser)
  const usersMatchingPattern = getUsersMatchingPattern(pattern).filter(
    displayName => {
      return displayName !== currentUserDisplayName && displayName !== alreadySharedUserOrGroup
    }
  )
  const groupPostfix = client.page.FilesPageElement.sharingDialog().getGroupSharePostfix()
  const userPostfix = client.page.FilesPageElement.sharingDialog().getUserSharePostfix()
  await assertUsersInAutocompleteList(usersMatchingPattern)
  assert.ok(
    !itemsList.includes(
      alreadySharedUserOrGroup +
      userOrGroup === 'group' ? groupPostfix : userPostfix
    ),
    `"${alreadySharedUserOrGroup}" was listed in the autocompletion list but should not have been`
  )

  // check if every created group that contains the pattern is listed in the autocomplete list
  const groupMatchingPattern = getGroupsMatchingPattern(pattern).filter(group => group !== alreadySharedUserOrGroup)
  return assertGroupsInAutocompleteList(groupMatchingPattern)
}

Given('user {string} has shared file/folder {string} with user {string}', function (sharer, elementToShare, receiver) {
  return shareFileFolder(elementToShare, sharer, receiver)
})

Given('the user has shared file/folder {string} with user {string}', function (elementToShare, receiver) {
  return shareFileFolder(elementToShare, client.globals.currentUser, receiver)
})

Given(
  'user {string} has shared file/folder {string} with user {string} with {string} permissions',
  function (sharer, elementToShare, receiver, permissions) {
    return shareFileFolder(elementToShare, sharer, receiver, SHARE_TYPES.user, permissions)
  }
)

Given('user {string} has shared file/folder {string} with group {string}', function (sharer, elementToShare, receiver) {
  return shareFileFolder(elementToShare, sharer, receiver, SHARE_TYPES.group)
})

Given(
  'user {string} has shared file/folder {string} with link with {string} permissions',
  function (sharer, elementToShare, permissions) {
    return shareFileFolder(elementToShare, sharer, null, SHARE_TYPES.public_link, permissions)
  }
)

Given(
  'user {string} has shared file/folder {string} with link with {string} permissions and password {string}',
  function (sharer, elementToShare, permissions, password) {
    return shareFileFolder(
      elementToShare,
      sharer,
      null,
      SHARE_TYPES.public_link,
      permissions,
      null,
      { password: password }
    )
  }
)

Given('the administrator has enabled exclude groups from sharing', function () {
  return runOcc(
    [
      'config:app:set core shareapi_exclude_groups --value=yes'
    ]
  )
})

Given('the administrator has excluded group {string} from sharing', async function (group) {
  const configList = await runOcc([
    'config:list'
  ])
  const config = _.get(configList, 'ocs.data.stdOut')
  const configParsed = JSON.parse(config)
  const initialExcludedGroup = JSON.parse(_.get(configParsed, 'apps.core.shareapi_exclude_groups_list') || '[]')
  if (!initialExcludedGroup.includes(group)) {
    initialExcludedGroup.push(group)
    const resultGroupList = initialExcludedGroup.map((res) => '"' + res + '"')
    const resultToString = resultGroupList.join(',')
    return runOcc(
      [
        'config:app:set',
        'core',
        'shareapi_exclude_groups_list',
        '--value=[' + resultToString + ']'
      ]
    )
  }
})

Given('the administrator has set the minimum characters for sharing autocomplete to {string}', function (value) {
  return runOcc(
    ['config:system:set user.search_min_length --value=' + value]
  )
})

Given('user {string} has created a public link with following settings',
  function (sharer, dataTable) {
    return createPublicLink(sharer, dataTable.rowsHash())
  })

Given('the administrator has excluded group {string} from receiving shares', async function (group) {
  const configList = await runOcc([
    'config:list'
  ])
  const config = _.get(configList, 'ocs.data.stdOut')
  const configParsed = JSON.parse(config)
  const initialExcludedGroup = JSON.parse(_.get(configParsed, 'apps.files_sharing.blacklisted_receiver_groups') || '[]')
  if (!initialExcludedGroup.includes(group)) {
    initialExcludedGroup.push(group)
    let excludedGroups = initialExcludedGroup.map((res) => `"${res}"`)
    excludedGroups = excludedGroups.join(',')
    return runOcc(
      [
        'config:app:set',
        'files_sharing',
        'blacklisted_receiver_groups',
        '--value=[' + excludedGroups + ']'
      ]
    )
  }
})

When('the user opens the share creation dialog in the webUI', function () {
  return client.page.FilesPageElement.sharingDialog().clickCreateShare()
})

When('the user cancels the share creation dialog in the webUI', function () {
  return client.page.FilesPageElement.sharingDialog().clickCancel()
})

When('the user types {string} in the share-with-field', function (input) {
  return client.page.FilesPageElement.sharingDialog().enterAutoComplete(input)
})

When('the user displays all share-autocomplete results using the webUI', function () {
  return client.page.FilesPageElement.sharingDialog().showAllAutoCompleteResults()
})

When('the user sets custom permission for current role of collaborator {string} for folder/file {string} to {string} using the webUI', function (user, resource, permissions) {
  return client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(resource)
    .changeCustomPermissionsTo(user, permissions)
})

When('the user disables all the custom permissions of collaborator {string} for file/folder {string} using the webUI', function (collaborator, resource) {
  return client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(resource)
    .disableAllCustomPermissions(collaborator)
})

const assertSharePermissions = async function (currentSharePermissions, permissions = undefined) {
  let expectedPermissionArray
  if (permissions !== undefined) {
    expectedPermissionArray = await client.page.FilesPageElement.sharingDialog().getArrayFromPermissionString(permissions)
  }
  const COLLABORATOR_PERMISSION_ARRAY = ['share', 'update', 'create', 'delete']
  for (let i = 0; i < COLLABORATOR_PERMISSION_ARRAY.length; i++) {
    const permissionName = COLLABORATOR_PERMISSION_ARRAY[i]
    if (permissions !== undefined) {
      // check all the required permissions are set
      if (expectedPermissionArray.includes(permissionName)) {
        assert.strictEqual(currentSharePermissions[permissionName], true, `Permission ${permissionName} is not set`)
      } else {
        // check unexpected permissions are not set or absent from the array
        assert.ok(!currentSharePermissions[permissionName], `Permission ${permissionName} is set`)
      }
    } else {
      // check all the permissions are not set or absent from the array
      assert.ok(!currentSharePermissions[permissionName], `Permission ${permissionName} is set`)
    }
  }
}

Then('custom permission/permissions {string} should be set for user {string} for file/folder {string} on the webUI',
  async function (permissions, user, resource) {
    const currentSharePermissions = await client.page
      .FilesPageElement
      .filesList()
      .closeSidebar(100)
      .openSharingDialog(resource)
      .getDisplayedPermission(user)

    return assertSharePermissions(currentSharePermissions, permissions)
  })

Then('no custom permissions should be set for collaborator {string} for file/folder {string} on the webUI', async function (user, resource) {
  const currentSharePermissions = await client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(resource)
    .getDisplayedPermission(user)

  return assertSharePermissions(currentSharePermissions)
})

When('the user shares file/folder/resource {string} with group {string} as {string} using the webUI', userSharesFileOrFolderWithGroup)

Then('it should not be possible to share file/folder {string} using the webUI', async function (resource) {
  const state = await client.page
    .FilesPageElement
    .filesList()
    .isSharingBtnPresent(resource)
  assert.ok(
    !state,
    `Error: Sharing button for resource ${resource} is not in disabled state`
  )
  const sidebarLinkTabState = await client.page
    .FilesPageElement
    .filesList()
    .isSidebarLinksTabPresent(resource)
  assert.ok(
    !sidebarLinkTabState,
    `Error: Sidebar 'Links' tab for resource ${resource} is present`
  )
  const sidebarCollaboratorsTabState = await client.page
    .FilesPageElement
    .filesList()
    .isSidebarCollaboratorsTabPresent(resource)
  assert.ok(
    !sidebarCollaboratorsTabState,
    `Error: Sidebar 'Collaborators' tab for resource ${resource} is present`
  )
})

When('the user shares file/folder/resource {string} with user {string} as {string} using the webUI', userSharesFileOrFolderWithUser)

When('the user shares file/folder/resource {string} with user {string} as {string} with permission/permissions {string} using the webUI', function (resource, shareWithUser, role, permissions) {
  return userSharesFileOrFolderWithUserOrGroup(resource, shareWithUser, false, role, permissions)
})

When('the user selects the following collaborators for the share as {string} with {string} permissions:', async function (role, permissions, usersTable) {
  const users = usersTable.hashes()
  const dialog = client.page.FilesPageElement.sharingDialog()

  for (const { collaborator, type } of users) {
    await dialog.selectCollaboratorForShare(collaborator, type === 'group')
  }

  await dialog.selectRoleForNewCollaborator(role)
  await dialog.selectPermissionsOnPendingShare(permissions)
})

When('the user removes {string} as a collaborator from the share', function (user) {
  return client.page.FilesPageElement.sharingDialog().removePendingCollaboratorForShare(user)
})

When('the user shares with the selected collaborators', function () {
  return client.page.FilesPageElement.sharingDialog()
    .confirmShare()
    .waitForOutstandingAjaxCalls()
})

Then('all users and groups that contain the string {string} in their name should be listed in the autocomplete list on the webUI', async function (pattern) {
  const currentUserDisplayName = userSettings.getDisplayNameForUser(client.globals.currentUser)
  // check if all created users that contain the pattern either in the display name or the username
  // are listed in the autocomplete list
  // in both cases the display name should be listed
  const usersMatchingPattern = getUsersMatchingPattern(pattern).filter(
    displayName => {
      return displayName !== currentUserDisplayName
    }
  )
  await assertUsersInAutocompleteList(usersMatchingPattern)
  // check if every created group that contains the pattern is listed in the autocomplete list
  const groupMatchingPattern = getGroupsMatchingPattern(pattern)
  await assertGroupsInAutocompleteList(groupMatchingPattern)
})

Then('all users and groups that contain the string {string} in their name should be listed in the autocomplete list on the webUI except user {string}', function (pattern, alreadySharedUser) {
  return assertUsersGroupsWithPatternInAutocompleteListExcluding(pattern, alreadySharedUser, 'user')
})

Then('all users and groups that contain the string {string} in their name should be listed in the autocomplete list on the webUI except group {string}', function (pattern, alreadySharedGroup) {
  return assertUsersGroupsWithPatternInAutocompleteListExcluding(pattern, alreadySharedGroup, 'group')
})

Then('only users and groups that contain the string {string} in their name or displayname should be listed in the autocomplete list on the webUI', function (pattern) {
  return client.page.FilesPageElement.sharingDialog().getShareAutocompleteItemsList()
    .then(itemsList => {
      itemsList.forEach(item => {
        const displayedName = item.split('\n')[0]
        var found = false
        for (var userId in userSettings.getCreatedUsers()) {
          const userDisplayName = userSettings.getDisplayNameForUser(userId)
          if (userDisplayName === displayedName &&
            (userDisplayName.toLowerCase().includes(pattern) || userId.toLowerCase().includes(pattern))
          ) {
            found = true
          }
        }
        userSettings.getCreatedGroups().forEach(function (groupId) {
          if (displayedName === groupId && groupId.toLowerCase().includes(pattern)) {
            found = true
          }
        })
        assert.strictEqual(
          found,
          true,
          `"${displayedName}" was listed in autocomplete list, but should not have been. ` +
          '(check if that is a manually added user/group)'
        )
      })
    })
})

Then('every item listed in the autocomplete list on the webUI should contain {string}', function (pattern) {
  return client.page.FilesPageElement.sharingDialog().getShareAutocompleteItemsList()
    .then(itemsList => {
      itemsList.forEach(item => {
        if (!item.toLowerCase().includes(pattern)) {
          assert.fail(`sharee ${item} does not contain pattern ${pattern}`)
        }
      })
    })
})

When('the user selects role {string}', function (role) {
  return client.page.FilesPageElement.sharingDialog().selectRoleForNewCollaborator(role)
})

When('the user confirms the share', function () {
  return client.page.FilesPageElement.sharingDialog().confirmShare()
})

Then('the users own name should not be listed in the autocomplete list on the webUI', function () {
  const currentUserDisplayName = userSettings.getDisplayNameForUser(client.globals.currentUser)
  return client.page.FilesPageElement.sharingDialog().getShareAutocompleteItemsList()
    .then(itemsList => {
      itemsList.forEach(item => {
        const displayedName = item.split('\n')[0]
        assert.notStrictEqual(
          displayedName,
          currentUserDisplayName,
          `Users own name: ${currentUserDisplayName} was not expected to be listed in the autocomplete list but was`
        )
      })
    })
})

Then('{string} {string} should not be listed in the autocomplete list on the webUI', async function (type, displayName) {
  const presence = await checkIsListedInAutoComplete(type, displayName)
  assert.ok(presence === false,
    `${displayName} was expected to not be listed in the autocomplete list but was found`)
})

Then('{string} {string} should be listed in the autocomplete list on the webUI', async function (type, displayName) {
  const presence = await checkIsListedInAutoComplete(type, displayName)
  assert.ok(presence === true,
    `${displayName} was expected to be listed in the autocomplete list but was not found`)
})

When('the user opens the share dialog for file/folder/resource {string} using the webUI', function (file) {
  return client.page.FilesPageElement.filesList().openSharingDialog(file)
})

When('the user deletes {string} as collaborator for the current file/folder using the webUI', function (user) {
  return client.page.FilesPageElement.sharingDialog().deleteShareWithUserGroup(user)
})

When(
  'the user changes the collaborator role of {string} for file/folder {string} to {string} using the webUI',
  function (collaborator, resource, newRole) {
    return client.page.FilesPageElement.filesList()
      .openSharingDialog(resource)
      .changeCollaboratorRole(collaborator, newRole)
  }
)

Then('user {string} should be listed as {string} in the collaborators list on the webUI', function (user, role) {
  return assertCollaboratorslistContains('user', user, role)
})

Then('user {string} should be listed as {string} in the collaborators list for file/folder/resource {string} on the webUI', function (user, role, resource) {
  client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(resource)
  return assertCollaboratorslistContains('user', user, role)
})

Then('group {string} should be listed as {string} in the collaborators list on the webUI', function (group, role) {
  return assertCollaboratorslistContains('group', group, role)
})

Then('group {string} should be listed as {string} in the collaborators list for file/folder/resource {string} on the webUI', function (group, role, resource) {
  client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(resource)
  return assertCollaboratorslistContains('group', group, role)
})

Then('user {string} should not be listed in the collaborators list on the webUI', function (user) {
  return assertCollaboratorslistDoesNotContain('user', user)
})

Then('group {string} should not be listed in the collaborators list on the webUI', function (user) {
  return assertCollaboratorslistDoesNotContain('group', user)
})

Then('user {string} should have received a share with these details:', function (user, expectedDetailsTable) {
  return sharingHelper.assertUserHasShareWithDetails(user, expectedDetailsTable, true)
})

Given('user {string} has created a new public link for resource {string}', function (user, resource) {
  return shareFileFolder(resource, user, '', SHARE_TYPES.public_link)
})

Then('user {string} should have a share with these details:', function (user, expectedDetailsTable) {
  return sharingHelper.assertUserHasShareWithDetails(user, expectedDetailsTable)
})

Then('the user should not be able to share file/folder/resource {string} using the webUI', async function (resource) {
  const shareResponse = await client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(resource)
    .getSharingPermissionMsg()
  const noSharePermissionsMsgFormat = "You don't have permission to share this %s"
  const noSharePermissionsFileMsg = util.format(noSharePermissionsMsgFormat, 'file')
  const noSharePermissionsFolderMsg = util.format(noSharePermissionsMsgFormat, 'folder')
  return assert.ok(
    noSharePermissionsFileMsg === shareResponse ||
    noSharePermissionsFolderMsg === shareResponse,
    `Expected: no permission to share resource '${resource}' but found: '${shareResponse}'`
  )
})

Then('the collaborators list for file/folder/resource {string} should be empty', async function (resource) {
  const count = (await client.page
    .FilesPageElement
    .filesList()
    .closeSidebar(100)
    .openSharingDialog(resource)
    .getCollaboratorsList()).length
  assert.strictEqual(count, 0, `Expected to have no collaborators for '${resource}', Found: ${count}`)
})

Then('the file/folder/resource {string} should be in {string} state on the webUI', function (filename, status) {
  status = status === 'Accepted' ? '' : status
  return client.page.sharedWithMePage().assertDesiredStatusIsPresent(filename, status)
})

Then('file/folder {string} shared by {string} should be in {string} state on the webUI', function (element, user, status) {
  status = status === 'Accepted' ? '' : status
  return client.page.sharedWithMePage().assertDesiredStatusIsPresent(element, status, user)
})

When('the user declines share {string} offered by user {string} using the webUI', function (filename, user) {
  return client.page.sharedWithMePage().declineAcceptFile('Decline', filename, user)
})

When('the user accepts share {string} offered by user {string} using the webUI', function (filename, user) {
  return client.page.sharedWithMePage().declineAcceptFile('Accept', filename, user)
})

Then('the file {string} should be in {string} state on the webUI after a page reload', async function (filename, status) {
  status = status === 'Accepted' ? '' : status
  await client.refresh()
  return client.page.sharedWithMePage().assertDesiredStatusIsPresent(filename, status)
})

Then('the autocomplete list should not be displayed on the webUI', async function () {
  const isVisible = await client.page.FilesPageElement.sharingDialog().isAutocompleteListVisible()
  return assert.ok(!isVisible, 'Expected: autocomplete list "not visible" but found "visible"')
})

Given('user {string} has declined the share {string} offered by user {string}', function (user, filename, sharer) {
  return sharingHelper.declineShare(filename, user, sharer)
})

Given('user {string} has accepted the share {string} offered by user {string}', function (user, filename, sharer) {
  return sharingHelper.acceptShare(filename, user, sharer)
})

Then('the file {string} shared by {string} should not be in {string} state', function (filename, sharer, status) {
  return client.page.sharedWithMePage().assertDesiredStatusIsAbsent(filename, sharer, status)
})

Then('file/folder {string} should be marked as shared by {string} on the webUI', function (element, sharer) {
  return client.page.sharedWithMePage().assertSharedByUser(element, sharer)
})

Then('the user {string} should not have created any shares', async function (user) {
  const shares = await sharingHelper.getAllSharesSharedByUser(user)
  assert.strictEqual(shares.length, 0, 'There should not be any share, but there are')
})
