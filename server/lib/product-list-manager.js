/**
 * @module productListManager
 * @description
 * Pre-defines products available for sale since this shouldn't be configurable by the client.
 * Exports a singleton instance of ProductListManager.
 */

'use strict';

/**
 * @description Manages the list of objects available for sale.
 */
class ProductListManager {
  constructor() {
    /**
     * @description A microtransaction or other purchaseable available for sale
     * @prop {mixed} id Unique identifier for this product
     * @prop {string} description Product description
     * @prop {string} cost The cost of the product expressed in USD with decimal. For example: '1.00'
     */
    class Product {
      constructor(id, description, cost) {
        Object.assign(this, {id, description, cost});
      }
    }

    /**
     * Default list of products available for sale
     * @type {Array<Product>}
     */
    this._defaultProductList = [
      new Product(1, 'Add $1.00 to wallet', '1.00'),
      new Product(2, 'Add $10.00 to wallet', '10.00'),
    ];

    this.resetToDefault();

    // Expose a reference to the Product class
    this.Product = Product;
  }

  /**
   * @return {Array<Product>} The active product list
   */
  getProductList() {
    return this._productList;
  }

  /**
   * Gets a product by its ID
   * @param {number} productId ID of the product to fetch
   * @return {?Product} The matching product, if one exists
   */
  getProductById(productId) {
    return this._productList.find(product => product.id === productId);
  }

  /**
   * Sets the active product list
   * @param {Array<Product>} newProductList The product list to use
   */
  useProductList(newProductList) {
    /**
     * List of products available for sale
     * @private
     * @type {Array<Product>}
     */
    this._productList = newProductList;
  }

  /**
   * Resets the product list to its original state
   */
  resetToDefault() {
    this.useProductList(this._defaultProductList);
  }
}

module.exports = new ProductListManager();
