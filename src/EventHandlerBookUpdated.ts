class EventHandlerBookUpdated extends EventHandler {

  protected processObject(baseBook: Bkper.Book, connectedBook: Bkper.Book, event: bkper.Event): string {
    let connectedCode = BotService.getBaseCode(connectedBook);

    let response = ''

    if (connectedCode != null && connectedCode != '') {

      if (baseBook.getFractionDigits() != connectedBook.getFractionDigits()) {
        connectedBook.setFractionDigits(baseBook.getFractionDigits())
        response += ` decimal places: ${baseBook.getFractionDigits()}`
      }
      
      if (baseBook.getDatePattern() != connectedBook.getDatePattern()) {
        connectedBook.setDatePattern(baseBook.getDatePattern())
        response += ` date pattern: ${baseBook.getDatePattern()}`
      }
      
      if (baseBook.getDecimalSeparator() != connectedBook.getDecimalSeparator()) {
        connectedBook.setDecimalSeparator(baseBook.getDecimalSeparator())
        response += ` decimal separator: ${baseBook.getDecimalSeparator()}`
      }
      
      if (baseBook.getTimeZone() != connectedBook.getTimeZone()) {
        connectedBook.setTimeZone(baseBook.getTimeZone())
        response += ` time zone: ${baseBook.getTimeZone()}`
      }

      const baseExcRatesUrl = baseBook.getProperty(EXC_RATES_URL_PROP);
      if (baseExcRatesUrl != connectedBook.getProperty(EXC_RATES_URL_PROP)) {
        connectedBook.setProperty(EXC_RATES_URL_PROP, baseExcRatesUrl)
        response += ` ${EXC_RATES_URL_PROP}: ${baseExcRatesUrl}`
      }

      const baseExcRatesCache = baseBook.getProperty(EXC_RATES_CACHE_PROP);
      if (baseExcRatesCache != connectedBook.getProperty(EXC_RATES_CACHE_PROP)) {
        connectedBook.setProperty(EXC_RATES_CACHE_PROP, baseExcRatesCache)
        response += ` ${EXC_RATES_CACHE_PROP}: ${baseExcRatesCache}`
      }
      
    }

    if (response != '') {
      connectedBook.update();
      return `${this.buildBookAnchor(connectedBook)}: ${response}`;
    }

  }


}