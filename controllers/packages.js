const { client } = require("../middleware/squareClient");
const { handleErrorMessage } = require("../hooks/handleErrorMessage");

module.exports = {
  getPackages: async (req, res) => {
    try {
      const catalogList = await client.catalog.searchItems({
        productTypes: ["APPOINTMENTS_SERVICE"],
      });

      if (!catalogList) {
        handleErrorMessage(
          "There was an error grabbing the appointment service type catalog list.",
        );
      }

      const result = await client.catalog.list({});

      if (!result) {
        handleErrorMessage(
          "There was an error grabbing the catalog list for the modifier list.",
        );
      }

      const modifiersFiltered = result.data.filter((catalog) => {
        if (catalog.type === "MODIFIER_LIST") {
          return catalog;
        }
      });

      if (!modifiersFiltered.length) {
        handleErrorMessage(
          "There was an error filtering out the modifier list.",
        );
      }

      const modifiers = modifiersFiltered[0].modifierListData.modifiers.map(
        (modifierList) => {
          if (modifierList.modifierData) {
            return {
              id: modifierList.id,
              updatedAt: modifierList.updatedAt,
              createdAt: modifierList.created_at,
              name: modifierList.modifierData.name,
              modifierListId: modifierList.modifierData.modifierListId,
              priceAmt: `${modifierList.modifierData.priceMoney.amount}`,
              priceCurr: modifierList.modifierData.priceMoney.currency,
            };
          }
        },
      );

      if (!modifiers.length) {
        handleErrorMessage("There was an error creating the modifiers list.");
      }

      const packageList = catalogList.items.map((item) => {
        if(item.itemData.productType === 'APPOINTMENTS_SERVICE') {
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

        if (item.itemData.modifierListInfo) {
          const modifiers = item.itemData.modifierListInfo.map(
            (modifierList) => {
              if (modifierList) {
                if (modifierList.modifierOverrides) {
                  return modifierList.modifierOverrides;
                }
              }
            },
          );

          return {
            modifiers: modifiers[0],
            descriptionPlaintext: item.itemData.descriptionPlaintext,
            descriptionHtml: item.itemData.descriptionHtml,
            name: item.itemData.name,
            variations: variations,
            version: `${item.version}`,
          };
        } else {
          return {
            descriptionPlaintext: item.itemData.descriptionPlaintext,
            descriptionHtml: item.itemData.descriptionHtml,
            name: item.itemData.name,
            variations: variations,
            version: `${item.version}`,
          };
        }
      }
        });

      if (!packageList.length) {
        handleErrorMessage("There was an error creating the package list");
      }

      res.json({ packageList: packageList, modifierList: modifiers });
    } catch (err) {
      handleErrorMessage(
        `There was an error grabbing the package list: ${err.message}`,
      );
    }
  },
};
