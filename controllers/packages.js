const { SquareError } = require("square");
const { client } = require("../middleware/squareClient");

module.exports = {
  getPackages: async (req, res) => {
    try {
      const catalogList = await client.catalog.searchItems({
        productTypes: ["APPOINTMENTS_SERVICE"],
      });

      let packageList;
      packageList = catalogList.items.map((item) => {
        const variations = item.itemData.variations.map((variation) => {
          if (variation.itemVariationData.priceMoney) {
            return {
              id: variation.id,
              name: variation.itemVariationData.name,
              itemId: variation.itemVariationData.itemId,
              priceMoneyAmt: `${variation.itemVariationData.priceMoney.amount}`,
              priceMoneyCurr: `${variation.itemVariationData.priceMoney.currency}`,
              serviceDuration: `${variation.itemVariationData.serviceDuration}`,
              presentAtAllLocations: variation.presentAtAllLocations,
              availableForBooking:
                variation.itemVariationData.availableForBooking,
            };
          } else {
            return {
              id: variation.id,
              name: variation.itemVariationData.name,
              itemId: variation.itemVariationData.itemId,
              serviceDuration: `${variation.itemVariationData.serviceDuration}`,
              presentAtAllLocations: variation.presentAtAllLocations,
              availableForBooking:
                variation.itemVariationData.availableForBooking,
            };
          }
        });

        return {
          descriptionPlaintext: item.itemData.descriptionPlaintext,
          descriptionHtml: item.itemData.descriptionHtml,
          name: item.itemData.name,
          variations: variations,
        };
      });

      res.json({ packageList: packageList });
    } catch (error) {
      if (error instanceof SquareError) {
        error.errors.forEach(function (e) {
          console.error(e.category);
          console.error(e.code);
          console.error(e.detail);
        });
        console.error(
          `There was an issue fetching the package catalogs - ${error}`,
        );
      } else {
        console.error("Unexpected error occurred: ", error);
      }
    }
  },
};
