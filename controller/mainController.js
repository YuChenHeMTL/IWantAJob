const clusterUtil = require("../middlewares/cluster");
const fs = require("fs");

module.exports = {
    getLinkedinJobs: async ctx => {
        await clusterUtil.createCluster().catch(err => console.log(err));
        ctx.body = "value";
    }
}