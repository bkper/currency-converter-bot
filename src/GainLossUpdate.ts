function doGet(e: GoogleAppsScript.Events.AppsScriptHttpRequestEvent) {
  //@ts-ignore
  let bookId = e.parameter.bookId;
  let book = BkperApp.getBook(bookId);
  const template = HtmlService.createTemplateFromFile('GainLossUpdateView');

  template.book = {
    id: bookId,
    name: book.getName(),
    timeZone: book.getTimeZone()
  }

  return template.evaluate().setTitle('Exchange Bot');;

}

function updateGainLoss(bookId: any, date: string) {
  let book = BkperApp.getBook(bookId);
  let connectedBooks = Service_.getConnectedBooks(book);
  let baseCode = Service_.getBaseCode(book);
  Service_.setRatesEndpoint(book, date);
  connectedBooks.forEach(connectedBook => {
    let connectedCode = Service_.getBaseCode(connectedBook);
    let group = book.getGroup(connectedCode);
    if (group != null) {
      let accounts = group.getAccounts();
      if (accounts != null) {
        accounts.forEach(account => {
          let connectedAccount = connectedBook.getAccount(account.getName());
          if (connectedAccount != null) {
            let expectedBalance = ExchangeApp.exchange(connectedAccount.getBalance()).from(connectedCode).to(baseCode).convert();
            let delta = account.getBalance() - expectedBalance;
            let excAccountName = `Exchange_${connectedCode}`;
            //Verify Exchange account created
            let accPrefix = book.getProperty('exc_acc_prefix');
            if (accPrefix != null && accPrefix.trim() != '') {
              excAccountName = `${accPrefix} - ${account.getName()}`;
            }
            let excAccount = book.getAccount(excAccountName);
            if (excAccount == null) {
              excAccount = book.createAccount(excAccountName);
            }
            if (account.isCredit()) {
              delta = delta * -1;
            }
            if (Math.round(delta) > 0) {
              book.record(`${account.getName()} ${excAccountName} ${book.formatValue(Math.abs(delta))} #exchange_loss`);
            }
            else if (Math.round(delta) < 0) {
              book.record(`${excAccountName} ${account.getName()} ${book.formatValue(Math.abs(delta))} #exchange_gain`);
            }
          }
        });
      }
    }
  });
}
