"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

import { MapPin, Locate, Info, Search, X, Loader2, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Skeleton } from "@/components/ui/skeleton";
import { useLocationPicker } from "./hooks";

import { LocationPickerProps } from "./dto";

const LocationPicker = ({
  latitude,
  longitude,
  onLocationChange,
  disabled = false,
  error,
  onLoadingChange,
}: LocationPickerProps): JSX.Element => {
  const {
    geoError,
    isLoadingGPS,
    isSearching,
    openSearch,
    searchResults,
    selectedAddress,
    selectedPlaceId,
    handleClearLocation,
    handleOpenSearchChange,
    handleSelectSearchResult,
    handleGetCurrentLocation,
    searchQuery,
    setSearchQuery,
    address,
    currentLat,
    currentLng,
    isLoadingAddress,
    mapInstanceRef,
    mapRef,
    formatAddressFromNominatim,
  } = useLocationPicker({
    onLocationChange,
    disabled,
    latitude,
    longitude,
    onLoadingChange,
  });

  return (
    <div className="space-y-4">
      <div
        className="flex flex-col sm:flex-row 
        sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <div className="text-sm font-medium">Localização (Opcional)</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  className="h-4 w-4
                  text-muted-foreground
                  cursor-help"
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Pesquise um endereço, clique no mapa ou use o GPS para
                  adicionar a localização.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={disabled || isLoadingGPS}
          className="w-full sm:w-auto"
        >
          <Locate className="h-4 w-4 mr-2" />
          {isLoadingGPS ? "Obtendo..." : "Obter Localização Atual"}
        </Button>
      </div>

      {/* 🔍 Address Search Field */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Buscar Endereço</div>
        <Popover open={openSearch} onOpenChange={handleOpenSearchChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openSearch}
              aria-label="Buscar Endereço"
              className="w-full justify-between
              h-auto min-h-[40px] py-2 px-3"
              disabled={disabled}
            >
              <div
                className="flex items-center gap-2 
                flex-1 text-left overflow-hidden"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span
                  className={`truncate ${!selectedAddress ? "text-muted-foreground" : ""}`}
                >
                  {selectedAddress ||
                    "Pesquisar por Posto Shell, Av. Paulista, etc."}
                </span>
              </div>
              {selectedAddress && (
                <span
                  role="button"
                  className="shrink-0 rounded-sm opacity-50
                  hover:opacity-100 focus:outline-none focus:ring-2
                  focus:ring-ring focus:ring-offset-2 ml-2 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    handleClearLocation();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearLocation();
                    }
                  }}
                  tabIndex={0}
                  aria-label="Limpar localização"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Limpar localização</span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Digite o endereço, bairro ou cidade..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {/* Skeleton during search */}
                {isSearching && (
                  <div className="p-3">
                    <div
                      className="px-2 py-1.5 text-xs font-medium 
                      text-muted-foreground flex items-center gap-2"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Buscando endereços...
                    </div>
                    <div className="space-y-1 mt-2">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-start 
                          gap-3 p-2 rounded-md"
                        >
                          <Skeleton
                            className="h-4 w-4 
                            rounded-full shrink-0 mt-0.5"
                          />
                          <div className="flex-1 space-y-2">
                            <Skeleton
                              className="h-4 w-full"
                              style={{ width: `${90 - i * 10}%` }}
                            />
                            <Skeleton
                              className="h-3 w-4/5"
                              style={{ width: `${80 - i * 8}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message sent when nothing has been typed yet and there are no results. */}
                {!isSearching &&
                  searchQuery.length === 0 &&
                  searchResults.length === 0 && (
                    <div
                      className="p-8 text-center 
                      text-sm text-muted-foreground"
                    >
                      <Search
                        className="mx-auto h-8 w-8 
                        text-muted-foreground/30 mb-3"
                      />
                      <p className="font-medium mb-1">Digite para pesquisar</p>
                      <p className="text-xs">
                        Ex: Estrada união indústria 5678, Petrópolis RJ
                      </p>
                    </div>
                  )}

                {/* Message displayed when less than 3 characters are typed. */}
                {!isSearching &&
                  searchQuery.length > 0 &&
                  searchQuery.length < 3 && (
                    <div
                      className="p-6 text-center 
                      text-xs text-muted-foreground"
                    >
                      Digite pelo menos 3 caracteres para buscar
                    </div>
                  )}

                {/* No results found */}
                {!isSearching &&
                  searchQuery.length >= 3 &&
                  searchResults.length === 0 && (
                    <CommandEmpty>
                      <div className="py-8 text-center">
                        <MapPin
                          className="mx-auto h-8 w-8 
                          text-muted-foreground/50 mb-2"
                        />
                        <p className="text-sm font-medium">
                          Nenhum endereço encontrado
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tente pesquisar de forma diferente
                        </p>
                      </div>
                    </CommandEmpty>
                  )}

                {!isSearching && searchResults.length > 0 && (
                  <CommandGroup
                    heading={`${searchResults.length} ${searchResults.length === 1 ? "endereço encontrado" : "endereços encontrados"}`}
                  >
                    {searchResults.map((result) => {
                      const formattedAddr = formatAddressFromNominatim(
                        result.address,
                      );

                      const hasNumber = result.address.house_number;
                      const isSelected =
                        selectedPlaceId === result.place_id.toString();

                      return (
                        <CommandItem
                          key={result.place_id}
                          value={`${result.place_id}-${result.display_name}`}
                          onSelect={() => handleSelectSearchResult(result)}
                          className="cursor-pointer py-3"
                        >
                          <MapPin className="mr-3 h-4 w-4 shrink-0 text-[#d81b60]" />
                          <div className="flex flex-col gap-1 overflow-hidden flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {formattedAddr}
                              </span>
                              {hasNumber && (
                                <span
                                  className="text-xs bg-[#d81b60]/10 
                                  text-[#d81b60] px-1.5 py-0.5 rounded shrink-0"
                                >
                                  Nº {result.address.house_number}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">
                              {result.display_name}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="ml-auto h-4 w-4 text-[#d81b60]" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Map with Framer Motion Ping Overlay */}
      <div
        className="relative border 
        rounded-lg overflow-hidden h-[300px]"
      >
        {/* Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <div ref={mapRef} className="h-full w-full" />
        </div>

        {/* Framer Motion Ping Effect Overlay */}
        {currentLat && currentLng && mapInstanceRef.current && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 
            -translate-y-1/2 pointer-events-none z-10"
            style={{
              transform: `translate(-50%, -50%)`,
            }}
          >
            <PingEffect />
          </div>
        )}
      </div>

      {/* Errors */}
      {(geoError || error) && (
        <Alert variant="destructive">
          <AlertDescription>{geoError || error}</AlertDescription>
        </Alert>
      )}

      {/* Info */}
      {currentLat && currentLng && (
        <Alert>
          {isLoadingAddress ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <AlertDescription>
            {isLoadingAddress ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <Skeleton className="h-3 w-48" />
              </div>
            ) : (
              <>
                <strong>Endereço:</strong> {address}
                <br />
                <span className="text-xs text-muted-foreground">
                  Coordenadas: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                </span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Component for the ping animation and marker
const PingEffect = () => {
  return (
    <div className="relative w-0 h-0">
      {/* Animated ping circle */}
      <motion.div
        className="absolute rounded-full bg-[#d81b60]/30"
        style={{ width: 30, height: 30, top: -15, left: -15 }}
        animate={{
          scale: [0.5, 1.5],
          opacity: [0.7, 0],
        }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          repeatDelay: 0.3,
          ease: "easeOut",
        }}
      />

      {/* White base dot */}
      <motion.div
        className="absolute rounded-full bg-white shadow-md"
        style={{ width: 14, height: 14, top: -7, left: -7 }}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
      />

      {/* Pin icon - perfectly centered */}
      <motion.div
        initial={{ y: -5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="absolute"
        style={{ top: -24, left: -12 }}
      >
        <MapPin className="h-6 w-6 text-[#d81b60]" strokeWidth={2.5} />
      </motion.div>
    </div>
  );
};

export default LocationPicker;
