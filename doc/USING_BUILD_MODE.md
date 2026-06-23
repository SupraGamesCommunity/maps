## Using Build Mode

Enabling "Build Mode" lets you make modifications to the map, so that you can contribute improvements to the map.

This section describes how to use Build Mode.


### Overview

The general workflow for using Build Mode is:

1. Enable Build Mode by navigating to "Build tools" in the sidebar menu, and checking the "Build Mode" checkbox.
2. Make some map modifications, such as updating comments, adding custom map pins, or adding Youtube video links.
   After each map modification, click the "Save" button on the Pin to temporarily buffer your changes in local
   memory.
3. To extract your changes, navigate to "Build tools" in the sidebar menu, and click "Copy changes". This will copy
   your changes as a JSON string to the clipboard.
4. Paste the JSON string into a plain text editor, such as Notepad++ or TextEdit, and save the changes.

(TODO: Explain where to place these changes on disc, and how to contribute changes back to the main project)


### How-to

This section demonstrates how Build Mode works by describing how to complete various tasks.


#### Add a YouTube link to a map pin

1. Navigate to "Build tools" in the sidebar, and enable Build Mode.
2. Click on a map pin.
3. Expand "Edit JSON".
4. Edit fields:
   * add YouTube video ID: e.g `86kucQtvtyA`
   * add YouTube video start time: e.g. `1196`
5. Click "Save" to save your changes to local memory and close the pin.
6. (Optional) Repeat the process from Step 2 for other map pins.
7. Navigate to "Build tools" in the sidebar, and click "Copy changes" to copy your edits to the clipboard.
8. Open the file `custom-markers.{game}.json` in a plain text editor.
9. Paste copied changes into file.


### Add a custom pin

1. At the bottom left of the map, click the pin icon and click "Add". A new pin will appear in the centre of the map.
2. Left-click drag the new map pin to the desired location.
3. (Optional) Repeat from step 1 to add more pins.
4. Click on bottom left pin menu icon, then click "Copy" to copy the new pin definitions to the clipboard.
5. Open a plain text editor, paste the clipboard into a text file.

To clear the new pins, click on the pin menu icon, then click "Clear".
