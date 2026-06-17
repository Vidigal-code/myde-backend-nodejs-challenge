import { Module } from '@nestjs/common';
import { META_PROVIDER } from './meta.types';
import { metaProvider } from './meta.factory';

/** Provider de envio Meta (híbrido real/simulado). Exporta o token META_PROVIDER. */
@Module({
  providers: [metaProvider],
  exports: [META_PROVIDER],
})
export class MetaModule {}
