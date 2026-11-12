Library of Pergamon is an epub and pdf reader.

In data, there are novels, series and volumes. Novels and series folders contain json identification files for the volumes, which are the ones destined to be read. There could be an epub, pdf and json file with the same name for the same volume. The json files contain information for the volumes, series and novels. The information should cascade up into the novel information and series information for display.

In src, there is main.js. All other js code should be in separate components loaded through main.js. Similarly, in styles, there is main.css, which should load separate components in the base folder, header folder, footer folder and other folders.

The website should stay in js, css and html.

The provided example is volume 10.75 of Girls' Frontline in data/volume/girlsfrontline with its corresponding series and novels json files. Adding a new series would imply a new file for series, novels and volume.

What website maintainers should be able to do:
- Simply place a pdf and/or epub in a folder with the json file of the same name.
- Place the correct filled out json files.
- If data is left blank, the specific data should not render but the rest of the file should.

What users should be able to do:
- View the different novels categorized by different series. When clicking on a novel, the different volumes are displayed in order.
- The information should be displayed and viewed on the respective element.
- The volumes can be viewed in a reader which is a scroller.
- There are reader settings and sorting settings along with wider local site settings such as theme settings.