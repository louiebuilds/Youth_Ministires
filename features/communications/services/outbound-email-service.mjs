export async function submitOutboundEmail(provider, message) {
  return provider.send(message);
}
