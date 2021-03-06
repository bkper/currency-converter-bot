import { Account, Book, Transaction } from "bkper";
import { getBaseCode } from "./BotService";
import { EXC_AMOUNT_PROP, EXC_AUTO_CHECK_PROP, EXC_CODE_PROP, EXC_RATE_PROP } from "./constants";
import { EventHandlerTransaction } from "./EventHandlerTransaction";

export class EventHandlerTransactionPostedOrChecked extends EventHandlerTransaction {

  protected getTransactionQuery(transaction: bkper.Transaction): string {
    return `remoteId:${transaction.id}`;
  }

  protected async connectedTransactionFound(baseBook: Book, connectedBook: Book, transaction: bkper.Transaction, connectedTransaction: Transaction): Promise<string> {
    if (connectedTransaction.isPosted() && !connectedTransaction.isChecked()) {
      await connectedTransaction.check();
      const resp = await this.buildCheckResponse(connectedBook, connectedTransaction);
      return resp;
    } else if (!connectedTransaction.isPosted() && await this.isReadyToPost(connectedTransaction)) {
      await connectedTransaction.post();
      await connectedTransaction.check();
      const resp = await this.buildCheckResponse(connectedBook, connectedTransaction);
      return resp;
    } else {
      const resp = await this.buildCheckResponse(connectedBook, connectedTransaction);
      return resp;
    }

  }

  private async buildCheckResponse(connectedBook: Book, connectedTransaction: Transaction) {
    let bookAnchor = super.buildBookAnchor(connectedBook);
    let amountFormatted = connectedBook.formatValue(connectedTransaction.getAmount());
    let record = `CHECKED: ${connectedTransaction.getDateFormatted()} ${amountFormatted} ${connectedTransaction.getDescription()}`;
    return `${bookAnchor}: ${record}`;
  }

  protected async connectedTransactionNotFound(baseBook: Book, connectedBook: Book, transaction: bkper.Transaction): Promise<string> {
    let baseCode = getBaseCode(baseBook);
    let baseCreditAccount = await baseBook.getAccount(transaction.creditAccount.id);
    let baseDebitAccount = await baseBook.getAccount(transaction.debitAccount.id);
    let connectedCode = getBaseCode(connectedBook);
    let connectedBookAnchor = super.buildBookAnchor(connectedBook);

    let connectedCreditAccount = await connectedBook.getAccount(baseCreditAccount.getName());
    if (connectedCreditAccount == null) {
      try {
        connectedCreditAccount = await this.createAccount(connectedBook, baseCreditAccount);
      } catch (err) {
        //OK
      }
    }
    let connectedDebitAccount = await connectedBook.getAccount(baseDebitAccount.getName());
    if (connectedDebitAccount == null) {
      try {
        connectedDebitAccount = await this.createAccount(connectedBook, baseDebitAccount);
      } catch (err) {
        //OK
      }
    }


    let amountDescription = await super.extractAmountDescription_(baseBook, connectedBook, baseCode, connectedCode, transaction);

    if (amountDescription.amount == null) {
      throw `Exchange rate NOT found for code  ${connectedCode} on ${transaction.date}`;
    }

    if (amountDescription.amount.eq(0)) {
      return null;
    }

    let newTransaction = connectedBook.newTransaction()
      .setDate(transaction.date)
      .setProperties(transaction.properties)
      .setAmount(amountDescription.amount)
      .setCreditAccount(await connectedBook.getAccount(baseCreditAccount.getName()))
      .setDebitAccount(await connectedBook.getAccount(baseDebitAccount.getName()))
      .setDescription(amountDescription.description)
      .addRemoteId(transaction.id);


      if (amountDescription.excBaseCode) {
        newTransaction.setProperty(EXC_CODE_PROP, amountDescription.excBaseCode);
      }

      if (amountDescription.excBaseRate) {
        newTransaction.setProperty(EXC_RATE_PROP, amountDescription.excBaseRate.toString())
      }

      let record = `${newTransaction.getDate()} ${newTransaction.getAmount()} ${baseCreditAccount.getName()} ${baseDebitAccount.getName()} ${amountDescription.description}`;

    const autoCheck = baseBook.getProperty(EXC_AUTO_CHECK_PROP);
    if (await this.isReadyToPost(newTransaction)) {
      await newTransaction.post();
      if (autoCheck) {
        await newTransaction.check();
      }
    } else {
      newTransaction.setDescription(`${newTransaction.getCreditAccount() == null ? baseCreditAccount.getName() : ''} ${newTransaction.getDebitAccount() == null ? baseDebitAccount.getName() : ''} ${newTransaction.getDescription()}`.trim())
      await newTransaction.create();
    }
    return `${connectedBookAnchor}: ${record}`;
  }


  private async isReadyToPost(newTransaction: Transaction) {
    return await newTransaction.getCreditAccount() != null && await newTransaction.getDebitAccount() != null && newTransaction.getAmount() != null;
  }

  private async createAccount(connectedBook: Book, baseAccount: Account): Promise<Account> {
    let newConnectedAccount = connectedBook.newAccount()
      .setName(baseAccount.getName())
      .setType(baseAccount.getType())
      .setProperties(baseAccount.getProperties());
    const baseGroups = await baseAccount.getGroups();
    if (baseGroups) {
      for (const baseGroup of baseGroups) {
        let connectedGroup = await connectedBook.getGroup(baseGroup.getName());
        if (connectedGroup == null) {
          connectedGroup = await connectedBook.newGroup().setName(baseGroup.getName()).setProperties(baseGroup.getProperties()).create();
        }
        await newConnectedAccount.addGroup(connectedGroup);        
      }
    }
    await newConnectedAccount.create();
    return newConnectedAccount;
  }
}