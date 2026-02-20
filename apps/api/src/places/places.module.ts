import { Module } from '@nestjs/common';

import { PlacesService } from '../analysis/services/places.service';
import { PlacesClient } from './services/places-client.service';
import { PlacesMapper } from './services/places-mapper.service';

@Module({
  providers: [PlacesClient, PlacesMapper, PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
