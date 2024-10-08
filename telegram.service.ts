import { BadRequestException } from '@nestjs/common';
import { Update } from 'nestjs-telegraf';
import { avitoGetAccessToken } from 'src/helpers/avito-get-access-token';
import { PrismaService } from 'src/prisma.service';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';


// при регистрации добавить функцию для записи в базу данных всех товаров из авито и убрать эту функцию из (получить товары)
// подключить базу данных
// проверить получение товара по его названию
// проверить функцию для получения товара, который еще не проходил парсинг(так же после парсинга добавить обновление)
// проверить изменение цены товара на авито 
// проверить все кнопки(их нажатие)








// отслеживать цены через парсер и менять в базе данных и авито (минимальный функционал)
// да / нет / ввести свое - это при зименении цены
@Update()
export class TelegramService {
  constructor(
    private readonly prisma: PrismaService
  ) {};

  // async showProductButtons(ctx: any): Promise<[[{text: string, callback_data: string}]]> {
  async showProductButtons(ctx: any) {
    const buttons = [
      [{ text: "✅ Да", callback_data: "agree" }, { text: "❌ Нет", callback_data: "dont_agree" }],
      [{ text: "Ввести свою цену", callback_data: "input_own_price" }],
    ];
    return buttons;
    // await ctx.reply("Цены", {
    //   reply_markup: {
    //     inline_keyboard: buttons
    //   }
    // })
  }

  // async getProductInfo(ctx: any) {
  //   const client_id = "DJHLUBhgJYFi_1wey4bV";
  //   const client_secret = "BeoZ3pBoIyfnbgHYYCBlmD_Y7wY843hV-7Frt3kb";
  //   // const { client_id, client_secret } = await this.getAvitoUserData(ctx);
  //   const token: string = await avitoGetAccessToken(client_id, client_secret);
  //   const item_id = 4257127998;
  //   const user_id = 354895619;
  //   const announcements = await fetch(`https://api.avito.ru/core/v1/accounts/${user_id}/items/${item_id}/`, {
  //     headers: {
  //       "Authorization": `Bearer ${token}`
  //     }
  //   });
  //   const data = await announcements.json();
  //   console.log(data);
  //   // {
  //   //   finish_time: '2024-10-11T16:47:26',
  //   //   start_time: '2024-09-11T16:44:14',
  //   //   status: 'active',
  //   //   url: 'https://www.avito.ru/sankt-peterburg/remont_i_stroitelstvo/smesitel_dlya_rakoviny_am.pm_gem_f90a03022_s_gigie_4257127998',
  //   //   vas: []
  //   // }
  // }

  async showMainMenu(ctx: any): Promise<void> {
    const buttons = [
      [{ text: "Получить все мои объявления", callback_data: "get_products" }],
      [{ text: "Зарегистрироваться", callback_data: "register" }],
      // [{ text: "Добавить артикул к товару", callback_data: "add_code" }],
      [{ text: "Обновить товары из авито", callback_data: "update_products" }],
      // [{ text: "Просмотреть товары, у которых нет артикула", callback_data: "show_products_without_code" }],
      // [{ text: "", callback_data: "" }],
    ];
    await ctx.reply("Главное меню:", {
      reply_markup: {
        inline_keyboard: buttons,
        resize_keyboard: true,
        remove_keyboard: true,
        one_time_keyboard: true,
      }
    });
  };

  // обработка нажатий на кнопку меню
  async handleCallbackQuery(ctx: any, action: string): Promise<void> {
    // const text = ctx.update.message.reply_to_message.text; // Введите Ваш email:
    // если пользователь не зарегистрирован, то не показывать клавиши(авторизация, показать все объявления, обновить товары, добавить артикул)
    switch(action) {

      case "register":
        const telegram_id = ctx.from.id; // 504081934
        const name = ctx.from.first_name;
        const user_name = ctx.from.username;
        ctx.session.userData = {};
        // записываем данные пользователя в сессию
        ctx.session.userData = { telegram_id, name, user_name };
        
        const url = 'https://developers.avito.ru/applications';
        await ctx.reply(`Здравствуйте ${name}`);
    
        await ctx.reply(`Для получения данных перейдите по ссылке ${url} (заголовок Разработчикам) там ссылка на (зарегистрируйте свое приложение) и скопируйте значения по очереди`)
        // просим пользователя добавить client_id
        return await this.handleCallbackQuery(ctx, "client_id");


        // return await this.registerUser(ctx);
        // return await ctx.reply("Нажата кнопка --> Зарегистрироваться");

      case "get_products":
        // const client_id = "DJHLUBhgJYFi_1wey4bV";
        // const client_secret = "BeoZ3pBoIyfnbgHYYCBlmD_Y7wY843hV-7Frt3kb";
        const { client_id, client_secret } = await this.getAvitoUserData(ctx);
        const token: string = await avitoGetAccessToken(client_id, client_secret);
        const announcements = await fetch("https://api.avito.ru/core/v1/items", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const { resources } = await announcements.json();
        // console.log(resources);
        
        await ctx.reply(`${resources.length} товаров получено`);

        // сделать проверку, что в базе данных этот товар уже есть(если нет, то добавить)
        await resources.forEach(async ({ id, price, title, url }) => {
          const announcementFromDatabase = await this.prisma.products.findUnique({
            where: {
              avito_id: id.toString()
            }
          });
          if(!announcementFromDatabase) {
            const user = await this.prisma.users.findUnique({
              where: {
                telegram_id: ctx.from.id.toString()
              }
            })
            const createdProduct = await this.prisma.products.create({
              data: {
                title,
                photo_url: "",
                avito_id: id.toString(),
                // user_id: ctx.from.id.toString()
                user_id: user.id
              }
            });
            return await this.prisma.prices.create({
              data: {
                price: price.toString(),
                product_id: createdProduct.id.toString()
              }
            })
          }
        })


        // получить все названия продукторв и их номера
        // const products = await this.getOnlyTitleProductWithNumber(ctx.from.id);
      //   const products = [  {
      //     address: 'Санкт-Петербург, ул. Типанова, 21',
      //     category: { id: 19, name: 'Ремонт и строительство' },
      //     id: 4288609796,
      //     price: 14220,
      //     status: 'active',
      //     title: 'Поддон для душа Bas Олимпик 100x80',
      //     url: 'https://www.avito.ru/sankt-peterburg/remont_i_stroitelstvo/poddon_dlya_dusha_bas_olimpik_100x80_4288609796'
      //   },
      //   {
      //     address: 'Санкт-Петербург, ул. Типанова, 21',
      //     category: { id: 19, name: 'Ремонт и строительство' },
      //     id: 4257424270,
      //     price: 9900,
      //     status: 'active',
      //     title: 'Гигиенический душ Damixa RedBlu Option 214000000 с',
      //     url: 'https://www.avito.ru/sankt-peterburg/remont_i_stroitelstvo/gigienicheskiy_dush_damixa_redblu_option_214000000_s_4257424270'
      //   },
      //   {
      //     address: 'Санкт-Петербург, ул. Типанова, 21',
      //     category: { id: 19, name: 'Ремонт и строительство' },
      //     id: 4257127998,
      //     price: 14100,
      //     status: 'active',
      //     title: 'Смеситель для раковины AM.PM Gem F90A03022 с гигие',
      //     url: 'https://www.avito.ru/sankt-peterburg/remont_i_stroitelstvo/smesitel_dlya_rakoviny_am.pm_gem_f90a03022_s_gigie_4257127998'
      //   },
      //   {
      //     address: 'Санкт-Петербург, ул. Типанова, 21',
      //     category: { id: 19, name: 'Ремонт и строительство' },
      //     id: 4257084166,
      //     price: 8290,
      //     status: 'active',
      //     title: 'Гигиенический душ Damixa Option 212000300 со смеси',
      //     url: 'https://www.avito.ru/sankt-peterburg/remont_i_stroitelstvo/gigienicheskiy_dush_damixa_option_212000300_so_smesi_4257084166'
      //   },
      //   {
      //     address: 'Санкт-Петербург, ул. Типанова, 21',
      //     category: { id: 19, name: 'Ремонт и строительство' },
      //     id: 4256921905,
      //     price: 8200,
      //     status: 'active',
      //     title: 'Гигиенический душ Damixa RedBlu Option 212000000 с',
      //     url: 'https://www.avito.ru/sankt-peterburg/remont_i_stroitelstvo/gigienicheskiy_dush_damixa_redblu_option_212000000_s_4256921905'
      //   }
      // ];
      let str = "";
      ctx.session.userData.products = []
      await resources.forEach(({ title, id }, ind) => {
          ctx.session.userData.products.push({ id, title, index: ind+1 });
          return str += `${ind+1}) ${title} \n`;
        });
        // console.log({str});
        
        // result.replace(/,/g, "");
        await ctx.reply(str);




        await ctx.reply("С каким товаром будем работать?", {
          reply_markup: {
            force_reply: true,
            input_field_placeholder: "Введите цифру, товара"
          }
        })
        



        // resources.forEach(async ({ address, category, id, price, status, title, url }) => {
        //   await ctx.reply(`Address: ${address} | id: ${id} | price: ${price} | status: ${status} | title: ${title} | url: ${url}`)
        //   // console.log(category); // { id: 19, name: 'Ремонт и строительство' }
        // });
        // console.log(resources);

        // проверить, зарегистрирован ли пользователь в системе
        const user = await this.prisma.users.findUnique({
          where: {
            telegram_id: ctx.from.id.toString()
          },
        });
        if(!user && user.client_id && user.client_secret) {
          await ctx.reply("Вы не зарегистрированы")
          return await ctx.reply("Зарегистрироваться?", {
            reply_markup: {
              inline_keyboard: [[{ text: "Зарегистрироваться", callback_data: "register" }]]
            }
          })
        } else {
          const avito_products = await this.prisma.products.findMany({
            where: {
              user_id: user.id
            }
          });
          // avito_products.forEach(async ({ id, photo_url, title }) => {
          //   const price = await this.prisma.prices.findFirst({ where: { product_id: id } })
          //   await ctx.replyWithPhoto(photo_url, {
          //     caption: `${title}\nЦена: ${price.price} руб.`,
          //   })
          //   await this.showProductButtons(ctx)
          // })
        };
        // return await this.showProductButtons(ctx);
        // console.log(await this.showProductButtons(ctx)); // получаем кнопки для товаров
        return;
        

      case "add_code":
        // спросить у пользователя, к какому товару хочет добавить артикул
        await ctx.reply("К какому товару хотите добавить артикул?", {
          reply_markup: {
            inline_keyboard: [[{ text: "Просмотреть товары без артикула", callback_data: "show_products_without_code" }]]
          },
        });
        return await ctx.reply("Нажата кнопка --> Добавить артикул к товару");  

      case "update_products":
        // добавить фукнцию, которая будет проверять товары, которые есть в базе данных и сверять их с товарами из авито
        return await ctx.reply("Нажата кнопка --> Обновить товары из авито");

      // case "show_products_without_code":
      //   return await ctx.reply("Нажата кнопка --> Просмотреть товары без артикула");

      case "agree":
        // обновить цену, из базы данных
        const price = ctx.session.userData.newPrice;
        return await this.updateAvitoPrice(ctx, 14200);
        return await ctx.reply("Нажата кнопка --> Да");

      case "dont_agree":
        // оставить прежнюю цену в базе данных
        return await ctx.reply("Нажата кнопка --> Нет");

      case "input_own_price":
        // получить введенную цену пользователем и обновить ту, на которую он написал
        await ctx.reply("Введите Вашу цену", {
          reply_markup: {
            force_reply: true,
            input_field_placeholder: "Новая цена"
          }
        })
        return await ctx.reply("Нажата кнопка --> Ввести свою цену");

      case "client_id":
        return await ctx.reply("Добавьте данные client_id из Вашего аккаунта avito", {
          reply_markup: {
            force_reply: true,
            input_field_placeholder: "client_id"
          }
        });

      case "client_secret":
        return await ctx.reply("Введите client_secret", {
          reply_markup: {
            force_reply: true,
            input_field_placeholder: "client_secret"
          },
        });

      case "check_avito_data":
        await ctx.reply("Давайте проверим Ваши данные");
        return await ctx.reply(`Вас зовут ${ctx.from.first_name} \n 
Ваши данные client_id: ${ctx.session.userData.client_id} \n
Ваши данные client_secret: ${ctx.session.userData.client_secret} ?
`, {

          reply_markup: {
            
            inline_keyboard: [[
              { text: "✅ Верно", callback_data: "true_avito_data" }, 
              { text: "❌ Неверно", callback_data: "false_avito_data" }
            ]],
          }
        })
      case "true_avito_data":
        // await ctx.reply("DONE")
        console.log(ctx.session.userData);
        
        return await this.registerUser(ctx);
      
      case "false_avito_data":
        ctx.session.userData = {};
        await ctx.reply("Все данные сброшены, давайте начнем сначала :(");
        setTimeout(async () => {
          await this.showMainMenu(ctx);
        }, 500)
        return;

      case "receive":
        // получить товары из авито !!!
        return await ctx.reply("Вы получили товары")
      
      case "reject":
        return await ctx.reply("Вы отклонили запрос на получение");

      case "launch_parser":
        // отправить запрос через на python апи для получения данных из ozon
        // получаем товар, по которому нужно получить данные из ozon
        const product = ctx.session.userData.parser;
        // return await ctx.reply("РАБОТА ПАРСЕРА");


        // отправляем запрос
        // const response = await axios.post('http://localhost:8000/search', {
        //   query: product.title,
        // }, {
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        // });
        // console.log({ resp: response.data });
        // const { result } = await response.data;

        // const url = 'http://localhost:8000/search';
        const data = { query: 'яблоко' };
        
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        };
        
        const response = await fetch('http://localhost:8000/search', options);
        const result = await response.json();
        // console.log({ result });
        
         

        // получаем минимальную цену на товар
        // const result = [
        //   {
        //     "product_id": "123456",
        //     "short_name": "Мыло детское",
        //     "full_name": "Мыло детское с экстрактом ромашки",
        //     "description": "Нежное мыло для чувствительной кожи",
        //     "url": "https://www.ozon.ru/product/123456",
        //     "price": "50 RUB",
        //     "price_with_card": "45 ₽",
        //     "image_url": "https://cdn1.ozone.ru/s3/multimedia-3/123456.jpg"
        //   },
        //   {
        //     "product_id": "123456",
        //     "short_name": "Мыло детское",
        //     "full_name": "Мыло детское с экстрактом ромашки",
        //     "description": "Нежное мыло для чувствительной кожи",
        //     "url": "https://www.ozon.ru/product/123456",
        //     "price": "40 RUB",
        //     "price_with_card": "45 ₽",
        //     "image_url": "https://cdn1.ozone.ru/s3/multimedia-3/123456.jpg"
        //   },
        // ];
        const cheapestProduct = await this.getCheapestProduct(result); // получили наименьшую цену в массиве
        // console.log({cheapestProduct});
        if(!cheapestProduct) {
          return await ctx.reply("Данные пустые")
        }
        
        // получаем цену из базы данных и делаем сравнение
        const productPrice = await this.prisma.prices.findFirst({
          where: {
            product_id: product.id.toString()
          },
          orderBy: { created_at: 'desc' }
        })
        // const productPrice = {
        //   price: "100"
        // };
        // делаем сравнение
        if(productPrice.price != cheapestProduct.price.split(' ')[0]) {
        // if(productPrice != cheapestProduct.price.split(' ')[0]) {
          await ctx.reply(`Цена на товар отличается от Вашей \nпрежняя цена ${productPrice.price}\nцена на Ozon ${cheapestProduct.price}`);
          ctx.session.userData.newPrice = +cheapestProduct.price.split(' ')[0]
          const buttons = await this.showProductButtons(ctx);
          return await ctx.reply("Изменяем цену на авито?", {
            reply_markup: {
              inline_keyboard: buttons
            }
          })
        } else {
          return await ctx.reply("Цена не изменилась");
        };

        

      default:
        return await ctx.reply("Неизвестная команда");

    };
  };


  async getCheapestProduct(products) {
    if(!products.length) {
      return 0;
    };
    return products.reduce((cheapest, product) => {
      const price = parseFloat(product.price.replace(' RUB', ''));
      const cheapestPrice = parseFloat(cheapest.price.replace(' RUB', ''));
      return price < cheapestPrice ? product : cheapest;
    });
  };



  // функция для обработки введенных данных пользователя
  async handleUserData(ctx: any) {

    // получаем сам запрос
    const text = ctx.update.message.reply_to_message.text; // Введите Ваш email:
    // const answer = ctx.text;

    // switch(true) {
    switch (!!text) {
      case text.includes("Введите Вашу цену"):
        // получаем id товара
        const item_id = ctx.session.userData.parser.id;
        return await this.updateAvitoPrice(ctx, +ctx.text);

        return await ctx.reply(`Ваша цена ${ctx.text}`)
      case text.includes("client_id"):
        // console.log(ctx.text)
        ctx.session.userData.client_id = ctx.text;
        return await this.handleCallbackQuery(ctx, "client_secret");
        // return await ctx.reply(`Ввести данные`);
      case text.includes("client_secret"):
        ctx.session.userData.client_secret = ctx.text;
        return await this.handleCallbackQuery(ctx, "check_avito_data");
      // case text.includes("Введите цифру, товара"):
      case text.includes("С каким товаром будем работать?"):
        // получаем id и название товара по номеру
        const product = ctx.session.userData.products.find(i => i.index == ctx.text);
        ctx.session.userData.parser = product;
        // console.log(product);
        // {
        //   id: 4257127998,
        //   title: 'Смеситель для раковины AM.PM Gem F90A03022 с гигие',
        //   index: 3
        // }
        return await ctx.reply("Теперь запустим парсер?", {
          reply_markup: {
            inline_keyboard: [[
              { text: "Запустить", callback_data: "launch_parser" }, 
              { text: "Отклонить", callback_data: "reject" }
            ]],
          }
        })
      default:
        // если данные не верны, то выдать ответ
        return await ctx.reply("Данные не верные")
    };
  };







  // регистрация пользователя
  async registerUser(ctx: any): Promise<void> {
    // получаем id пользователя telegram
    const telegram_id = ctx.from.id.toString(); // 504081934
    const user_name = ctx.from.first_name;
    // записываем данные пользователя в сессию
    // ctx.session.userData = {telegram_id, user_name};
    // console.log();
    
    
    // const url = 'https://developers.avito.ru/applications';
    // await ctx.reply(`Здравствуйте ${user_name}`);

    // await ctx.reply(`Для получения данных перейдите по ссылке ${url} (заголовок Разработчикам) там ссылка на (зарегистрируйте свое приложение) и скопируйте значения по очереди`)
    // просим пользователя добавить client_id
    // return await this.handleCallbackQuery(ctx, "client_id")


    try {
      const user = await this.prisma.users.create({
        data: {
          name: ctx.from.username,
          user_name: ctx.from.first_name,
          telegram_id: ctx.from.id.toString(),
          client_id: ctx.session.userData.client_id,
          client_secret: ctx.session.userData.client_secret
        }
      });
      console.log({ user });
      
      if(user) {
        await ctx.reply("Вы успешно зарегистрированы");
        return await ctx.reply("Теперь получим Ваши товары из Авито?", {
          reply_markup: {
            inline_keyboard: [[
              { text: "Получить", callback_data: "receive" }, 
              { text: "Отклонить запрос", callback_data: "reject" }
            ]],
          }
        })

      }
    } catch ({ message }) {
      console.log(message);
      return message;
    }
    // добавляем данные пользователя в базу данных

  };

  // // получить от пользователя client_id из авито
  // async getUserClientIdFromAvito(ctx: any): Promise<void> {
  // }

  // // получить от пользователя client_secret из авито
  // async getClientSecretFromAvito(ctx: any): Promise<void> {
  // }

  // получить все товары пользователя из базы данных    
  async getAllProductsFromDatabase(ctx: any): Promise<void> {
    // const productsJSON = await this.prisma.products.findMany({
    //   where: {
    //     telegram_id: ctx.from.id
    //   }
    // });
    // const products = await productsJSON.json();
    // return products;
  };

  // добавить все товары из авито в базу данных
  async addAllProductsFromAvitoToDatabase(ctx: any): Promise<void> {
    try {
      // const user = await this.prisma.users.findUnique({
      //   where: {
      //     telegram_id: ctx.from.id
      //   }
      // })
      // const token = await avitoGetAccessToken(user.client_id, user.client_secret);

      // // получаем все товары из авито
      // const announcements = await fetch("https://api.avito.ru/core/v1/items", {
      //     headers: {
      //       "Authorization": `Bearer ${token}`
      //     }
      //   });
        // const { resources } = await announcements.json();
        // await resources.forEach(async ({ id, title, price }) => {
        //   const product = await this.prisma.products.create({
        //     data: {
        //       title,
        //       photo_url: "",
        //       avito_id: id,
        //       user_id: ctx.from.id
        //     }
        //   });
        //   return await this.prisma.prices.create({
        //     data: {
        //       price,
        //       product_id: product.id
        //     }
        //   })
        // });
    } catch ({ message }) {
      console.log(message);
      return message;
    }

  };

  // обновить товары из авито в базе данных 
  async updateAllProductsFromDatabase(ctx: any, price: string): Promise<void> {
  };

  // получить товар из базы данных по названию (картинка товара, название и описание товара, артикул(если он есть))
  // и также получить его id
  async getProductFromDatabaseByProductName(ctx: any, title: string): Promise<void> {
    try {
      // const user = await await this.prisma.users.findUnique({
      //   where: {
      //     telegram_id: ctx.from.id
      //   }
      // })
      // const product = await this.prisma.products.findFirst({
      //   where: {
      //     title,
      //     user_id: user.id
      //   }
      // });
      // return product;
    } catch ({ message }) {
      console.log(message);
      return message;
    }
    // const product = await this.prisma.products.findFirst({
    //   where: {
    //     title,
    //     telegram_id: ctx.from.id
    //   }
    // });
    // if(!product) {
    //   throw new BadRequestException("Товар по этому названию не найдем!");
    // }
    // return product;
  };

  // ПОКА ЧТО НЕ НУЖНО
  // // добавить артикул товару
  // async addCodeToProduct(ctx: any, code: string, id: string): Promise<void> {

  // };

  // получить все названия товаров
  async getAllProductNames(ctx: any): Promise<void> {
    // const productsJSON = await this.prisma.products.findmany({
    //   where: {
    //     telegram_id: ctx.from.id
    //   },
    //   select: {
    //     title: true
    //   }
    // });
    // const productTitles = await productsJSON.json();
    // return productTitles;
  };

  // НУЖНо
  // получить client_id и client_secret пользователя из базы данных
  async getAvitoUserData(ctx: any): Promise<{client_id: string, client_secret: string}> {
    const userJSON = await this.prisma.users.findUnique({
      where: {
        telegram_id: ctx.from.id.toString()
      }
    });
    // const { client_id, client_secret } = await userJSON.json();
    const { client_id, client_secret } = await userJSON;
    return { client_id, client_secret }
  };

  // получить график изменения цен по id
  async getProductByIdAndDisplayGraph(ctx: any, id: string): Promise<void> {

    // const result = new Chart(ctx, {
    //   type: 'bar',
    //   data: {
    //     labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    //     datasets: [{
    //       label: '# of Votes',
    //       data: [12, 19, 3, 5, 2, 3],
    //       borderWidth: 1
    //     }]
    //   },
    //   options: {
    //     scales: {
    //       y: {
    //         beginAtZero: true
    //       }
    //     }
    //   }
    // });
    // await ctx.replyWithPhoto({ source: result });






    // получаем даты, только за этот месяц
    // const dates = [
    //   '2024-09-01', '2024-09-02', '2024-09-03', '2024-09-04', '2024-09-05',
    //   '2024-09-06', '2024-09-07', '2024-09-08', '2024-09-09', '2024-09-10',
    //   '2024-09-11', '2024-09-12', '2024-09-13', '2024-09-14', '2024-09-15',
    //   '2024-09-16', '2024-09-17', '2024-09-18', '2024-09-19', '2024-09-20',
    //   '2024-09-21', '2024-09-22', '2024-09-23', '2024-09-24', '2024-09-25',
    //   '2024-09-26', '2024-09-27', '2024-09-28', '2024-09-29', '2024-09-30'
    // ];
    // // получаем все ЦЕНЫ
    // const prices = [
    //   100, 102, 101, 103, 104, 105, 106, 107, 108, 109,
    //   110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
    //   120, 121, 122, 123, 124, 125, 126, 127, 128, 129
    // ];

    // отображаем график
    // const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 600 });
    // const configuration = {
    //   type: 'line',
    //   data: {
    //     labels: dates,
    //     datasets: [{
    //       label: 'Price Changes',
    //       data: prices,
    //       fill: false,
    //       borderColor: 'rgb(75, 192, 192)',
    //       tension: 0.1
    //     }]
    //   }
    // };
    // const image = await chartJSNodeCanvas.renderToBuffer(configuration);


    // const width = 800;
    // const height = 600;
    // const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
    // const configuration = {
    //   type: 'line',
    //   data: {
    //     labels: dates,
    //     datasets: [
    //       {
    //         label: 'Price',
    //         data: prices,
    //         borderColor: 'rgba(75, 192, 192, 1)',
    //         fill: false,
    //       },
    //     ],
    //   },
    // };
    // await ctx.replyWithPhoto({ source: configuration });
  };

  // обновить цену в базе данных и в авито
  async updateProductPriceAvito(ctx: any, product_id: string, price: string): Promise<void> {
    // const updatedResult = await this.prisma.prices.create({
    //   data: {
    //     product_id,
    //     price
    //   }
    // });
    // return await updatedResult.json();
  };

  // обновить цену на авито 
  async updateAvitoPrice(ctx: any, price: number): Promise<void> {
    // {
    //   "id": 4257127998,
    //   "title": "Смеситель для раковины AM.PM Gem F90A03022 с гигие",
    //   "index": 3,
    //   price: 14100
    // }

    // const url = `https://api.avito.ru/core/v1/items/${ctx.session.userData.parser.id}/update_price`;
    const item_id = 4257127998;
    const url = `https://api.avito.ru/core/v1/items/${item_id}/update_price`;
    
    // const { client_id, client_secret } = await this.getAvitoUserData(ctx);
    const client_id = "DJHLUBhgJYFi_1wey4bV";
    const client_secret = "BeoZ3pBoIyfnbgHYYCBlmD_Y7wY843hV-7Frt3kb";
    const token = await avitoGetAccessToken(client_id, client_secret);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ price: price })
      });
      const { result } = await response.json();
      // console.log(result.success);
      
      if(result) {
        return await ctx.reply("✅ Обновление прошло успешно!");
      }
      return await ctx.replace("❌ Обновление прошло с ошибкой");
    } catch ({ message }) {
      console.log(message);
      return message;
    }
  };

  async getProductsWithoutCode(ctx: any) {
    try {
      const client_id = "DJHLUBhgJYFi_1wey4bV";
      const client_secret = "BeoZ3pBoIyfnbgHYYCBlmD_Y7wY843hV-7Frt3kb";
      const url = "https://api.avito.ru/token";

      const params = new URLSearchParams();
          params.append('client_id', client_id);
          params.append('client_secret', client_secret);
          params.append('grant_type', 'client_credentials');
      
      const response = await fetch(url, {
          method: "POST",
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString()
      });
      const { access_token } = await response.json();
      
      const userInfoJson = await fetch("https://api.avito.ru/core/v1/accounts/self", {
        headers: {
          "Authorization": `Bearer ${access_token}`
        }
      });
      const userInfo = await userInfoJson.json();
      // console.log(userInfo);
      // {
      //   email: '9275288@mail.ru',
      //   id: 354895619,
      //   name: 'Музей сантехники и плитки',
      //   phone: '79119275288',
      //   profile_url: 'https://www.avito.ru/user/f8340dfd573fe74520d65b20bf3f2d00/profile'
      // }
      
      return await ctx.reply(`User Info ${userInfo}`)
    } catch ({ message }) {
      console.log(message);
      return message;
    };
  };

  // обновить цену объявления в авито по item_id
  async updateAnnouncementPriceFromAvito(ctx: any) {
    try {
      const token = "";
      const url = "https://api.avito.ru/core/v1/items/{item_id}/update_price";
      const item_id = "";
      const price = 123;
      const udpatePriceResponse = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(price)
      })
    } catch ({ message }) {
      console.log(message);
      return message;
    }
  };

  // функция которая будет выводить пользователю название товара и его номер(1, 2, 3 ...)
  async getOnlyTitleProductWithNumber(telegram_id: string) {
    // try {
    //   const productsFromDatabase = await this.prisma.products.findMany({
    //     where: {
    //       telegram_id,
    //     }
    //   });
    //   return productsFromDatabase;
    // } catch ({ message }) {
    //   console.log(message);
    //   return message;
    // };
  };


  //// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  // получить товар, который еще не проходил парсинг, через поле updated_at
  async getOldProduct(ctx: any) {
    // const oldProduct = await this.prisma.products.findMany({
    //   where: {
    //     telegram_id: ctx.from.id
    //   },
    //   orderBy: {
    //     updated_at: 'desc',
    //   },
    // });

  };


  // // !!!!!!!!!!!!!!!!!!!!!!!!!!!
  // // установить для теста время в 2 минуты --> потом поменять на 1 раз в час
  // @Cron('45 * * * * *')
  // async mainParserFunc(ctx: any, title: string) {
  //   // получаем товар по его названию
  //   const product = (await this.prisma.products.findFirst({
  //     where: {
  //       title,
  //       user_id: ctx.from.id
  //     }
  //   })).json(); // проверить !!!!!!
    
  //   // получаем актуальную цену у товара
  //   const productPrice = (await this.prisma.prices.findFirst({
  //     where: {
  //       product_id: product.id
  //     }
  //   })).json();

  //   // отправляем название товара в python код и получаем результат

  //   // получаем список из массива цен и получаем меньшую цену
  //   const parsingPrices = ["1000", "1200", "1100"];
  //   // берем самую низкую цену
  //   const minPrice = Math.min(...parsingPrices.map(i => +i));
  //   if( productPrice.price > minPrice || productPrice < minPrice ) {
      
  //     // предлагаем пользователю изменить, оставить свою цену или отменить
  //     // await ctx.replyWithPhoto({source: "photo_url.jpeg"});
  //     await ctx.reply(`Минимальная цена у товара {название и картинка товара} на рынке теперь - ${minPrice}`)
  //     const buttons = await this.showProductButtons(ctx);
  //     return await ctx.reply("Что делать с данными?", {
  //       reply_markup: {
  //         inline_keyboard: buttons
  //       }
  //     });

  //   } else {
  //     // в противном случае обновляем поле updated_at

  //     return;
  //   }
    
  // };

};