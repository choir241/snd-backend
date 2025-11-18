const { SquareError } = require("square");
const client = require('../middleware/squareClient');

module.exports = {
  getPackages: async (req, res) => {
    try {
        const catalogList = await client.catalog.list();
        const packageList = catalogList.data.map((item)=>{
          if(item !== undefined && item.itemData !== undefined && item.itemData.productType === "APPOINTMENTS_SERVICE"){              
              return {
                descriptionPlaintext: item.itemData.descriptionPlaintext,
                descriptionHtml: item.itemData.descriptionHtml,
                name: item.itemData.name
              }
          }
        });
        res.json(packageList);
    } catch (error) {
      if (error instanceof SquareError) {
        error.errors.forEach(function (e) {
          console.error(e.category);
          console.error(e.code);
          console.error(e.detail);
        });
        console.error(`There was an issue fetching the package catalogs - ${error}`)
      } else {
        console.error("Unexpected error occurred: ", error);
      }
    }
  },
};
