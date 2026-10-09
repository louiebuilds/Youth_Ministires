export async function submitOutboundSms(provider, message) {
  return provider.send(message);
}
