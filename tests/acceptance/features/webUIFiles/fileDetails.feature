Feature: User can open the details panel for any file or folder
  As a user
  I want to be able to open the details panel of any file or folder
  So that the details of the file or folder are visible to me

  Background:
    Given these users have been created with default attributes:
      | username |
      | user1    |
      | user2    |
    And user "user1" has logged in using the webUI
    And the user has browsed to the files page

  @files_versions-app-required
  Scenario: View different areas of the app-sidebar for a file in files page
    When the user picks the row of file "lorem.txt" in the webUI
    Then the app-sidebar should be visible
    And the thumbnail should be visible in the app-sidebar
    And the "versions" details panel should be visible
    When the user switches to "collaborators" tab in details panel using the webUI
    Then the "collaborators" details panel should be visible

  @files_versions-app-required
  Scenario: View different areas of the app-sidebar for a folder in files page
    When the user picks the row of folder "simple-folder" in the webUI
    Then the app-sidebar should be visible
    And the thumbnail should be visible in the app-sidebar
    And the "links" details panel should be visible
    And no "collaborators" tab should be available in the details panel
    And no "versions" tab should be available in the details panel

  @files_versions-app-required
  Scenario: View different areas of the app-sidebar for a file in favorites page
    Given user "user1" has favorited element "lorem.txt"
    And the user has browsed to the favorites page
    When the user picks the row of file "lorem.txt" in the webUI
    Then the app-sidebar should be visible
    And the thumbnail should be visible in the app-sidebar
    And the "versions" details panel should be visible
    When the user switches to "collaborators" tab in details panel using the webUI
    Then the "collaborators" details panel should be visible

  @files_versions-app-required
  Scenario: View different areas of the app-sidebar for a folder in favorites page
    Given user "user1" has favorited element "simple-folder"
    And the user has browsed to the favorites page
    When the user picks the row of folder "simple-folder" in the webUI
    Then the app-sidebar should be visible
    And the thumbnail should be visible in the app-sidebar
    And the "links" details panel should be visible
    And no "collaborators" tab should be available in the details panel
    And no "versions" tab should be available in the details panel

  @skip @yetToImplement
  @comments-app-required @public_link_share-feature-required
  Scenario: user shares a file through public link and then the details dialog should work in a Shared by link page
    Given the user has created a new public link for folder "simple-folder" using the webUI
    When the user browses to the shared-by-link page
    Then folder "simple-folder" should be listed on the webUI
    When the user opens the file action menu of folder "simple-folder" in the webUI
    And the user clicks the details file action in the webUI
    Then the details dialog should be visible in the webUI
    And the thumbnail should be visible in the details panel
    When the user switches to "sharing" tab in details panel using the webUI
    Then the "sharing" details panel should be visible
    When the user switches to "comments" tab in details panel using the webUI
    Then the "comments" details panel should be visible

  @comments-app-required
  Scenario: user shares a file and then the details dialog should work in a Shared with others page
    Given user "user1" has shared folder "simple-folder" with user "user2"
    When the user browses to the shared-with-others page
    Then folder "simple-folder" should be listed on the webUI
    When the user picks the row of folder "simple-folder" in the webUI
    Then the app-sidebar should be visible
    And the thumbnail should be visible in the app-sidebar
    When the user switches to "collaborators" tab in details panel using the webUI
    Then the "collaborators" details panel should be visible
#    When the user switches to "comments" tab in details panel using the webUI
#    Then the "comments" details panel should be visible
    When the user switches to "links" tab in details panel using the webUI
    Then the "links" details panel should be visible

  @comments-app-required
  Scenario: user shares a folder via link and then the details dialog should work in a Shared with others page
    Given user "user1" has created a new public link for resource "simple-folder"
    When the user browses to the shared-with-others page
    Then folder "simple-folder" should be listed on the webUI
    When the user picks the row of folder "simple-folder" in the webUI
    Then the app-sidebar should be visible
    And the thumbnail should be visible in the app-sidebar
    When the user switches to "collaborators" tab in details panel using the webUI
    Then the "collaborators" details panel should be visible
#    When the user switches to "comments" tab in details panel using the webUI
#    Then the "comments" details panel should be visible
    When the user switches to "links" tab in details panel using the webUI
    Then the "links" details panel should be visible

  @comments-app-required
  Scenario: the recipient user should be able to view different areas of details panel in Shared with me page
    Given user "user1" has shared folder "simple-folder" with user "user2"
    And the user re-logs in as "user2" using the webUI
    When the user browses to the shared-with-me page
    Then folder "simple-folder (2)" should be listed on the webUI
    When the user picks the row of folder "simple-folder (2)" in the webUI
    Then the app-sidebar should be visible
    And the thumbnail should be visible in the app-sidebar
    When the user switches to "collaborators" tab in details panel using the webUI
    Then the "collaborators" details panel should be visible
#    When the user switches to "comments" tab in details panel using the webUI
#    Then the "comments" details panel should be visible
    When the user switches to "links" tab in details panel using the webUI
    Then the "links" details panel should be visible

  @issue-2150
  Scenario: without any share the shared-with-others page should be empty
    When the user browses to the shared-with-others page using the webUI
    Then there should be no files/folders listed on the webUI

  @issue-2150
  Scenario: without any share the shared-with-me page should be empty
    When the user browses to the shared-with-me page using the webUI
    Then there should be no files/folders listed on the webUI

  @skip @yetToImplement
  @comments-app-required
  Scenario: View different areas of details panel for the folder with given tag in Tags page
    Given user "user1" has created a "normal" tag with name "simple"
    And user "user1" has added tag "simple" to folder "simple-folder"
    When the user browses to the tags page
    And the user searches for tag "simple" using the webUI
    Then folder "simple-folder" should be listed on the webUI
    When the user opens the file action menu of folder "simple-folder" in the webUI
    And the user clicks the details file action in the webUI
    Then the details dialog should be visible in the webUI
    And the thumbnail should be visible in the details panel
    When the user switches to "sharing" tab in details panel using the webUI
    Then the "sharing" details panel should be visible
    When the user switches to "comments" tab in details panel using the webUI
    Then the "comments" details panel should be visible
