import { Action, Command, Ctx, InjectBot, On, Start, Update } from "nestjs-telegraf";
import { Context, Telegraf } from "telegraf";
import { TelegramService } from "./telegram.service";

@Update()
export class TelegramUpdate {
    constructor(
        @InjectBot() private readonly bot: Telegraf<Context>,
        private readonly telegramService: TelegramService
    ){}

    @Start()
    async startCommand(ctx: Context) {
        // await this.telegramService.getProductByIdAndDisplayGraph(ctx, "");
        await ctx.reply("Вас приветствует авито бот");
        await this.showMainMenu(ctx);

        // await ctx.reply("С чего начнем?", {
        //     reply_markup: {
        //         inline_keyboard: [
        //             [{ text: "Получить все мои объявления", callback_data: "get_products" }],
        //             [{ text: "Зарегистрироваться", callback_data: "register" }],
        //             [{ text: "Добавить артикул к товару", callback_data: "add_code" }],
        //             [{ text: "Обновить товары из авито", callback_data: "update_products" }]
        //         ],
        //         // remove_keyboard: true,
        //         // resize_keyboard: true,
        //         // one_time_keyboard: true,
        //     }
        // })
        // добавить кнопки для работы
        // (получить все объявления,)
    };

    @Action(/.*/)
    async onAction(ctx: Context) {
        const callbackQuery = ctx.callbackQuery;
        if(callbackQuery && 'data' in callbackQuery) {
            const action = callbackQuery['data'];
            await this.telegramService.handleCallbackQuery(ctx, action);
        } else {
            await ctx.reply("Неизвестная команда или формат данных");
        }
    }

    @Command('menu')
    async showMainMenu(@Ctx() ctx: Context): Promise<void> {
        await this.telegramService.showMainMenu(ctx);
    };

    @On("text")
    async textAction(@Ctx() ctx: Context) {
      // обрабатываем ввод клавиатуры
      await this.telegramService.handleUserData(ctx);
    }
  

    // @On('text')
    // @WizardStep(2)
    // async onName(
    //   @Ctx() ctx: WizardContext,
    //   @Message() msg: { text: string },
    // ): Promise<string> {
    //   console.log('Enter to step 1');
    //   ctx.wizard.state['name'] = msg.text;
    //   await ctx.wizard.next();
    //   return 'Send me where are you from';
    // }
}