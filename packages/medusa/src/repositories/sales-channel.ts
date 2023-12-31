import { DeleteResult, FindOptionsWhere, ILike, In } from "typeorm"
import { SalesChannel } from "../models"
import { ExtendedFindConfig } from "../types/common"
import { dataSource } from "../loaders/database"

const productSalesChannelTable = "product_sales_channel"

export const SalesChannelRepository = dataSource
  .getRepository(SalesChannel)
  .extend({
    async getFreeTextSearchResultsAndCount(
      q: string,
      options: ExtendedFindConfig<SalesChannel> = {
        where: {},
      }
    ): Promise<[SalesChannel[], number]> {
      const options_ = { ...options }

      options_.where = options_.where as FindOptionsWhere<SalesChannel>
      delete options_?.where?.name
      delete options_?.where?.description

      options_.where = [
        {
          ...options_.where,
          name: ILike(`%${q}%`),
        },
        {
          ...options_.where,
          description: ILike(`%${q}%`),
        },
      ]

      let qb = this.createQueryBuilder()
        .select()
        .where(options_.where)
        .skip(options_.skip)
        .take(options_.take)

      if (options_.withDeleted) {
        qb = qb.withDeleted()
      }

      return await qb.getManyAndCount()
    },

    async removeProducts(
      salesChannelId: string,
      productIds: string[]
    ): Promise<DeleteResult> {
      const whereOptions = {
        sales_channel_id: salesChannelId,
        product_id: In(productIds),
      }

      return await this.createQueryBuilder()
        .delete()
        .from(productSalesChannelTable)
        .where(whereOptions)
        .execute()
    },

    async addProducts(
      salesChannelId: string,
      productIds: string[]
    ): Promise<void> {
      const valuesToInsert = productIds.map((id) => ({
        sales_channel_id: salesChannelId,
        product_id: id,
      }))

      await this.createQueryBuilder()
        .insert()
        .into(productSalesChannelTable)
        .values(valuesToInsert)
        .orIgnore()
        .execute()
    },

    async listProductIdsBySalesChannelIds(
      salesChannelIds: string | string[]
    ): Promise<{ [salesChannelId: string]: string[] }> {
      salesChannelIds = Array.isArray(salesChannelIds)
        ? salesChannelIds
        : [salesChannelIds]

      const result = await this.createQueryBuilder()
        .select(["sales_channel_id", "product_id"])
        .from(productSalesChannelTable, "psc")
        .where({ sales_channel_id: In(salesChannelIds) })
        .execute()

      return result.reduce((acc, curr) => {
        acc[curr.sales_channel_id] ??= []
        acc[curr.sales_channel_id].push(curr.product_id)

        return acc
      }, {})
    },
  })

export default SalesChannelRepository
