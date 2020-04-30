BkperApp.setApiKey(PropertiesService.getScriptProperties().getProperty('API_KEY'));

/**
 * Bkper trigger
 */
function onTransactionPosted(bookId: string, transaction: bkper.TransactionV2Payload): any {
  let book = BkperApp.getBook(bookId);
  let baseCurrency = book.getProperty('currency');

  if (baseCurrency == null || baseCurrency == '') {
    return 'Please set the "currency" property of this book.'
  }

  let responses: string[] = [];
  for (const key in book.getProperties()) {
    if (key.startsWith('currency_') && key.endsWith('_book')) {
      let targetBook = BkperApp.getBook(book.getProperties()[key]);
      let targetCurrency = targetBook.getProperty('currency');
      if (targetCurrency != null && targetCurrency != '') {

        if (targetBook.getAccount(transaction.creditAccName) == null) {
          targetBook.createAccount(transaction.creditAccName);
        }

        if (targetBook.getAccount(transaction.debitAccName) == null) {
          targetBook.createAccount(transaction.debitAccName);
        }

        let rate = getRate_(baseCurrency, targetCurrency);
        let record = `${transaction.informedDateText} ${targetBook.formatValue(rate * transaction.amount)} ${transaction.creditAccName} ${transaction.debitAccName} ${transaction.description}`;
        targetBook.record(`${record} id:currency_${transaction.id}`);
        let bookAnchor = `<a href='https://app.bkper.com/b/#transactions:bookId=${targetBook.getId()}' target='_blank'>${targetBook.getName()}</a>`;
        responses.push(`${bookAnchor}: ${record}`)
      }
    }
  }

  return responses;
}


function getRate_(base:string, currency:string) {
  let latestRates = getLatestRates_(base);
  currency = currency.toUpperCase();
  //@ts-ignore
  return latestRates.rates[currency];
}

interface LatestRates {
  "base": string,
  "date": string,
  "rates": Map<string, number>
}

function getLatestRates_(base: string): LatestRates {
  base = base.toLowerCase();
  //TODO get from the API's
  let latests = {
    usd: {
      "base": "USD",
      "date": "2019-04-27",
      "rates": {
        "BRL": 5.59,
        "UYU": 43.19,
        }
      },
    brl: {
      "base": "BRL",
      "date": "2019-04-27",
      "rates": {
        "USD": 0.18,
        "UYU": 7.69,
        }
      },
    uyu: {
      "base": "UYU",
      "date": "2019-04-27",
      "rates": {
        "USD": 0.023,
        "BRL": 0.13,
        }
      },
    }
    //@ts-ignore
    return latests[base] as LatestRates;
}

