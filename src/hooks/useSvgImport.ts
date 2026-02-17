import { useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { logger } from '../utils/logger';
import { ImportManager } from '../utils/import/ImportManager';

export interface ImportOptions {
    appendMode?: boolean;
    resizeImport?: boolean;
    resizeWidth?: number;
    resizeHeight?: number;
    applyUnion?: boolean;
    addFrame?: boolean;
}

export const useSvgImport = () => {
    const toast = useToast();

    const importSvgFiles = useCallback(async (files: FileList | File[], options: ImportOptions = {}) => {
        if (!files || files.length === 0) return;


        try {
            const importedPathCount = await ImportManager.importFiles(files, options);

            toast({
                title: 'SVGs Imported',
                description: `Successfully imported ${importedPathCount} path${importedPathCount !== 1 ? 's' : ''} from ${files.length} file${files.length !== 1 ? 's' : ''}`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

        } catch (error) {
            logger.error('Failed to import SVGs', error);
            toast({
                title: 'Import Failed',
                description: error instanceof Error ? error.message : 'Failed to import SVG files',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [toast]);

    return { importSvgFiles };
};
