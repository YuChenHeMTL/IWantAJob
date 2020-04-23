const router = require('koa-router')()
const controller = require("../controller/mainController");
/**
 * @swagger
 * /:
 *   get:
 *     description: Returns the homepage
 *     responses:
 *       200:
 *         description: hello world
 */
router.get('/', async ctx => {
    ctx.body = "hello Koa2!"
})

router.get('/linkedin', controller.getLinkedinJobs);

module.exports = router
